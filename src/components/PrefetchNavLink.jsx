import { NavLink } from 'react-router-dom';
import { preloadOnIntent } from '../lib/routeModules';
// Warm only the route the user points to, focuses, or touches.
export default function PrefetchNavLink({to,onMouseEnter,onFocus,onPointerDown,...props}) {
  const intent = handler => event => {
    handler?.(event);
    if (!event.defaultPrevented) preloadOnIntent(to);
  };
  return <NavLink {...props} to={to} onMouseEnter={intent(onMouseEnter)} onFocus={intent(onFocus)} onPointerDown={intent(onPointerDown)} />;
}
