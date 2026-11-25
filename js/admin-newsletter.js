(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const storageKey = "agasobanuye257-admin-auth";
  let client = null, loading = false, subscribers = [];

  function status(message, error=false) {
    const node=$("#newsletterAdminMessage");
    if(!node)return;
    node.textContent=message;
    node.classList.toggle("error",error);
  }
  function escapeHTML(value) {
    return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  }
  async function getClient() {
    if(client)return client;
    const config=window.AGASOBANUYE257_CONFIG||{};
    if(!window.supabase||!config.supabaseUrl||!config.supabaseAnonKey)throw new Error("Supabase is not configured.");
    const raw=sessionStorage.getItem(storageKey);
    if(!raw)throw new Error("Sign in to Admin Studio first.");
    const saved=JSON.parse(raw);
    if(!saved.access_token||!saved.refresh_token)throw new Error("Admin session is not ready. Sign in again.");
    client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
    const {error}=await client.auth.setSession({access_token:saved.access_token,refresh_token:saved.refresh_token});
    if(error)throw error;
    return client;
  }

  function exportSubscribers() {
    if (!subscribers.length) { status("There are no subscribers to export.", true); return; }
    const quote = value => {
      let text = String(value ?? "");
      if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    const lines = [["Email","Subscribed at","Active"], ...subscribers.map(row => [
      row.email, row.subscribed_at, row.is_active ? "Yes" : "No"
    ])];
    const csv = "\uFEFF" + lines.map(row => row.map(quote).join(",")).join("\r
");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8"}));
    const link = document.createElement("a");
    link.href = url;
    link.download = "agasobanuye257-newsletter-subscribers.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    status(subscribers.length + " subscriber records exported.");
  }

  async function loadSubscribers() {
    if(loading)return;
    loading=true;
    const list=$("#newsletterAdminList");
    if(!list){loading=false;return;}
    list.innerHTML='<p class="admin-hint">Loading subscribers…</p>';
    try{
      const db=await getClient();
      const {data,error}=await db.from("newsletter_subscribers").select("id,email,is_active,subscribed_at").order("subscribed_at",{ascending:false}).limit(500);
      if(error)throw error;
      const rows=data||[];
      subscribers=rows;
      list.innerHTML=rows.map(x=>'<article class="catalogue-item"><div class="catalogue-copy"><strong>'+escapeHTML(x.email)+'</strong><small>Subscribed '+escapeHTML(new Date(x.subscribed_at).toLocaleString())+'</small></div><div class="catalogue-actions"><button class="admin-button danger" type="button" data-remove-subscriber="'+escapeHTML(x.id)+'">Remove</button></div></article>').join("")||'<p class="admin-hint">No newsletter subscribers yet.</p>';
      status(rows.length+" subscriber"+(rows.length===1?"":"s")+" loaded.");
    }catch(error){
      list.innerHTML="";
      status(error.message||"Could not load subscribers.",true);
    }finally{loading=false;}
  }
  const panel=$("#studioPanel");
  if(panel){
    const observer=new MutationObserver(()=>{
      if(!panel.hidden)loadSubscribers();
    });
    observer.observe(panel,{attributes:true,attributeFilter:["hidden"]});
    if(!panel.hidden)loadSubscribers();
  }
  $("#newsletterRefresh")?.addEventListener("click",loadSubscribers);
  $("#newsletterExport")?.addEventListener("click",exportSubscribers);
  $("#newsletterAdminList")?.addEventListener("click",async event=>{
    const button=event.target.closest("[data-remove-subscriber]");
    if(!button)return;
    if(!confirm("Remove this email from the newsletter list?"))return;
    button.disabled=true;
    try{
      const db=await getClient();
      const {error}=await db.from("newsletter_subscribers").delete().eq("id",button.dataset.removeSubscriber);
      if(error)throw error;
      status("Subscriber removed.");
      await loadSubscribers();
    }catch(error){status(error.message||"Could not remove subscriber.",true);button.disabled=false;}
  });
  document.querySelectorAll('[data-view="newsletter"]').forEach(link=>link.addEventListener("click",()=>{const title=$("#viewTitle");if(title)title.textContent="Newsletter";loadSubscribers();}));
})();
