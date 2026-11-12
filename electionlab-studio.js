/* ElectionLab Studio — presentation layer; preserves all existing data and portrait logic. */
(()=>{'use strict';
const targets=[...document.querySelectorAll('.studio-home-section,.studio-standings,.studio-trend,.studio-pres-trend,.el28-split,.elBanner')];
if(!('IntersectionObserver' in window)||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('studio-visible');observer.unobserve(entry.target)}}),{threshold:.06});
targets.forEach(el=>{el.setAttribute('data-studio-reveal','');observer.observe(el)});
})();
