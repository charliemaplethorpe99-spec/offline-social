export type Route = 'inbox' | 'updates' | 'create' | 'settings' | 'capabilities';
export type DemoMessage = { id:string; from:'them'|'you'; kind:'text'|'link'; text:string; time:string; url?:string };
export type Conversation = { id:string; name:string; handle:string; initials:string; color:string; preview:string; when:string; unread?:boolean; messages:DemoMessage[] };
export const conversationFixtures:Conversation[] = [
  {id:'c1',name:'Maya Chen',handle:'@mayachen',initials:'MC',color:'coral',preview:'That little bookshop is so you 🌿',when:'9:41',unread:true,messages:[
    {id:'m0',from:'them',kind:'text',text:'I finally went for that long walk by the river.',time:'Yesterday'},
    {id:'m0b',from:'you',kind:'text',text:'How was it? The weather looked perfect.',time:'Yesterday'},
    {id:'m1',from:'them',kind:'text',text:'Hey! I found the loveliest little bookshop this weekend.',time:'9:34'},
    {id:'m2',from:'them',kind:'link',text:'A reel Maya shared',time:'9:35',url:'https://www.instagram.com/reel/'},
    {id:'m3',from:'you',kind:'text',text:'Oh, sending this straight to my weekend list.',time:'9:38'},
    {id:'m4',from:'them',kind:'text',text:'That little bookshop is so you 🌿',time:'9:41'}]},
  {id:'c2',name:'Theo Martin',handle:'@theomartin',initials:'TM',color:'blue',preview:'Coffee next week? My treat.',when:'Yesterday',messages:[{id:'m5',from:'them',kind:'text',text:'Coffee next week? My treat.',time:'Yesterday'}]},
  {id:'c3',name:'Nina Patel',handle:'@ninapatel',initials:'NP',color:'lilac',preview:'Sent you a photo',when:'Tue',messages:[{id:'m6',from:'them',kind:'text',text:'Sent you a photo',time:'Tue'}]},
];

export function boundPageSize(requested:number,maximum=50){ return Math.max(1,Math.min(Math.floor(requested),maximum)); }
export function canUseCapability(capability:'messaging'|'publishing'|'profile', accountType:'personal'|'creator'|'business'|null, granted:string[]=[]){
  if(!accountType || accountType==='personal') return false;
  const permission = capability==='messaging'?'instagram_business_manage_messages':capability==='publishing'?'instagram_business_content_publish':'instagram_business_basic';
  return granted.includes(permission);
}
export function safeInstagramUrl(value:string){ try { const url=new URL(value); return url.protocol==='https:' && (url.hostname==='instagram.com'||url.hostname.endsWith('.instagram.com')) ? url.href : null; } catch { return null; } }
