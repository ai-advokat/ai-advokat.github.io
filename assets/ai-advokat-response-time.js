/* AI Advokat shared response timer (internal + external bots).
 * Local display only: no model requests, secrets, storage or network calls.
 */
(function(scope){
  "use strict";
  function milliseconds(value){
    const n=Number(value);
    return Number.isFinite(n) ? Math.max(0,n) : 0;
  }
  function formatClock(value){
    const seconds=Math.floor(milliseconds(value)/1000);
    return String(Math.floor(seconds/60)).padStart(2,"0")+":"+String(seconds%60).padStart(2,"0");
  }
  function formatDuration(value){
    const tenths=Math.round(milliseconds(value)/100);
    const minutes=Math.floor(tenths/600);
    const seconds=Math.floor((tenths%600)/10);
    const fraction=tenths%10;
    return (minutes ? minutes+" мин " : "")+seconds+","+fraction+" сек";
  }
  function createClock({onTick=()=>{}}={}){
    const now=()=>typeof scope.performance?.now==="function" ? scope.performance.now() : Date.now();
    const startedAt=now();
    let stoppedAt=null;
    const elapsedMs=()=>milliseconds((stoppedAt===null?now():stoppedAt)-startedAt);
    const tick=()=>{
      if(stoppedAt!==null) return;
      try{onTick(elapsedMs());}catch{} // Broken presentation never blocks a legal answer.
    };
    tick();
    const interval=scope.setInterval(tick,250);
    function stop(){
      if(stoppedAt===null){
        stoppedAt=now();
        scope.clearInterval(interval);
      }
      return elapsedMs();
    }
    return Object.freeze({elapsedMs,stop});
  }
  scope.AIAdvokatResponseTime=Object.freeze({createClock,formatClock,formatDuration});
})(globalThis);
