import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gzipSync} from 'node:zlib';
import {pageLoaders, preloadRoute, preloadOnIntent} from '../src/lib/routeModules.js';

// Verify the actual production dependency graph, not just import text.
const manifest = JSON.parse(await fs.readFile('dist/.vite/manifest.json','utf8'));
function closure(key, seen = new Set()) {
  if (seen.has(key)) return seen;
  assert(manifest[key], `Missing production route: ${key}`);
  seen.add(key);
  for (const dependency of manifest[key].imports || []) closure(dependency, seen);
  return seen;
}
const exportPackages = ['node_modules/xlsx/', 'node_modules/jspdf/', 'node_modules/html2canvas/'];
for (const route of ['src/pages/Reports.jsx', 'src/pages/teacher/Reports.jsx', 'src/pages/MonthlyAchievement.jsx', 'src/pages/teacher/MonthlyAchievement.jsx']) {
  const dependencies = closure(route);
  for (const key of dependencies) assert(!exportPackages.some(pkg => key.includes(pkg)), `${route} eagerly loads ${key}`);
  let compressed=0;
  for (const key of dependencies) compressed += gzipSync(await fs.readFile(path.join('dist',manifest[key].file))).length;
  console.log(`PASS: ${route}: ${(compressed/1024).toFixed(1)} KiB gzip, export tools deferred.`);
}
assert(![...closure('src/pages/teacher/Dashboard.jsx')].some(k=>/TeacherCharts|recharts/i.test(k)), 'Charts delay the teacher dashboard');
assert(![...closure('index.html')].some(k=>/AdminLayout|TeacherLayout|StudentLayout/i.test(k)), 'Portal shells delay the public app');

// A direct URL warms its shell and page concurrently; repeated intent shares
// the request and a failed request can be retried. No live data is fetched.
const calls=[];let finishPage,finishLayout;
pageLoaders.TeacherAttendance=()=>{calls.push('page');return new Promise(resolve=>{finishPage=resolve;});};
pageLoaders.TeacherLayout=()=>{calls.push('layout');return new Promise(resolve=>{finishLayout=resolve;});};
const first=preloadRoute('/teacher/attendance');
const repeated=preloadRoute('/teacher/attendance?date=2026-10-05');
assert.deepEqual(calls,['page','layout']);finishPage({default:'page'});finishLayout({default:'layout'});await Promise.all([first,repeated]);
let attempts=0;
pageLoaders.TeacherStudents=()=>++attempts===1?Promise.reject(new Error('offline')):Promise.resolve({default:'students'});
await assert.rejects(preloadRoute('/teacher/students'),/offline/);await preloadRoute('/teacher/students');assert.equal(attempts,2);
let intentional=0;
pageLoaders.TeacherPoints=async()=>{intentional++;return {default:'points'};};
Object.defineProperty(globalThis,'navigator',{value:{connection:{saveData:true}},configurable:true});
preloadOnIntent('/teacher/points');await Promise.resolve();assert.equal(intentional,0);
navigator.connection.saveData=false;navigator.connection.effectiveType='2g';preloadOnIntent('/teacher/points');assert.equal(intentional,0);
navigator.connection.effectiveType='4g';preloadOnIntent('/teacher/points');await preloadRoute('/teacher/points');assert.equal(intentional,1);
await preloadRoute('/unknown-route');
console.log('PASS: parallel route warming, request reuse, retry and data-saver behavior.');

// Render the installed dashboard against a verified layout context, and then
// exercise refresh. Initial mount reuses scope; refresh must fetch fresh data.
const React = await import('react');
const {default: Renderer, act} = await import('react-test-renderer');
const {transformWithOxc} = await import('vite');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const scopeCalls=[];
const profile={id:101,full_name:'Fixture',role:'teacher',status:'active',is_active:true};
const assignments=[{halaqa_id:202,teacher_role:'main'}];
const context={teacher:profile,assignmentsPromise:Promise.resolve(assignments)};
const fakeClient={auth:{getUser:async()=>{scopeCalls.push('auth');return {data:{user:{id:'fixture'}},error:null};}},from:()=>({select(){return this;},eq(){return this;},async single(){scopeCalls.push('profile');return {data:profile,error:null};}})};
const fixtures={React,context,supabase:fakeClient,getTeacherAssignments:async()=>{scopeCalls.push('assignments');return assignments;},getTeacherDashboardData:async args=>{scopeCalls.push(['data',args.teacherId,args.halaqaId]);return {stats:{studentsCount:20}};}};
globalThis.dashboardPerformanceFixture=fixtures;
const source=(await fs.readFile('src/pages/teacher/Dashboard.jsx','utf8')).replace(/^import[\s\S]*?;\n/gm,'').replace(/const TeacherCharts = lazyWithRetry\([^\n]+\);/,'');
const components=['DashboardSkeleton','TeacherHero','TeacherStats','TeacherCharts','TopStudents','LatestRecitations','TeacherAlerts','QuickActions','TeacherJoinOnboarding','RefreshCw','UserRoundCheck','Link'];
const prelude='const {React,context,supabase,getTeacherAssignments,getTeacherDashboardData}=globalThis.dashboardPerformanceFixture;const {Suspense,useCallback,useEffect,useMemo,useState}=React;const useOutletContext=()=>context;const showToast=()=>{};\n'+components.map(name=>`const ${name}=props=>React.createElement('div',null,props.children||'${name}');`).join('\n');
const compiled=await transformWithOxc(prelude+source,'Dashboard.jsx',{jsx:{runtime:'classic'}});
const Dashboard=(await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'))).default;
let view;await act(async()=>{view=Renderer.create(React.createElement(Dashboard));});
assert.deepEqual(scopeCalls,[['data',101,202]],'Initial dashboard repeats authentication/profile/assignment requests');
assert(JSON.stringify(view.toJSON()).includes('TeacherStats'));
const refresh=view.root.findAllByType('button').find(button=>String(button.props.children).includes('تحديث البيانات'));
assert(refresh);await act(async()=>{await refresh.props.onClick();});
assert.deepEqual(scopeCalls.slice(1,4),['auth','profile','assignments'],'Explicit refresh fails to revalidate account scope');
assert.deepEqual(scopeCalls.at(-1),['data',101,202]);
await act(async()=>view.unmount());
console.log('PASS: teacher dashboard reuses verified scope on mount and revalidates on refresh.');
