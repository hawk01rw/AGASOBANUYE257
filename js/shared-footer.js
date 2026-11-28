/* Keep the approved footer markup from each page intact. */
(()=>{"use strict";
const updateYear=()=>document.querySelectorAll("[data-footer-year]").forEach(node=>{node.textContent=String(new Date().getFullYear());});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",updateYear,{once:true});else updateYear();
})();
