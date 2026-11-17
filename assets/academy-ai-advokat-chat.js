/* Academy AI ADVOKAT quick chat: one existing Worker bot, loaded ONLY after a click.
   If Cloudflare disallows cross-origin framing, the always-visible full-tab link is the fallback.
   No extra AI provider, local storage, transmission of user content or automatic conversations. */
(function(){
  'use strict';
  var BOT_URL='https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/';
  function boot(){
    var launch=document.getElementById('academyChatLaunch');
    var dialog=document.getElementById('academyChatDialog');
    var hero=document.getElementById('academyChatOpenHero');
    var close=document.getElementById('academyChatClose');
    var mount=document.getElementById('academyChatFrame');
    var full=document.getElementById('academyChatFullLink');
    if(!launch||!dialog||!hero||!close||!mount||!full)return;
    full.href=BOT_URL;
    var loaded=false;
    function open(){
      // Never create a second bot on pages where the primary LexNova widget already exists.
      if(!loaded){
        var frame=document.createElement('iframe');
        frame.title='AI ADVOKAT · професионален правен разговор';
        frame.src=BOT_URL;
        frame.referrerPolicy='no-referrer';
        frame.loading='eager';
        frame.setAttribute('allow','microphone');
        mount.replaceChildren(frame);
        loaded=true;
      }
      if(!dialog.open){
        if(typeof dialog.showModal==='function')dialog.showModal();
        else dialog.setAttribute('open','');
      }
      launch.setAttribute('aria-expanded','true');
      close.focus();
    }
    function dismiss(){
      if(dialog.open){
        if(typeof dialog.close==='function')dialog.close();
        else dialog.removeAttribute('open');
      }
      launch.setAttribute('aria-expanded','false');
      launch.focus();
    }
    launch.addEventListener('click',open);
    hero.addEventListener('click',open);
    close.addEventListener('click',dismiss);
    dialog.addEventListener('close',function(){launch.setAttribute('aria-expanded','false');});
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&dialog.open)dismiss();
    });
    // No iframe or worker request is made until the user clicks Open.
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
