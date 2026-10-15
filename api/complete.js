module.exports=async(req,res)=>{
if(req.method!=='POST')return res.status(405).json({error:'method'});
const key=process.env.GEMINI_API_KEY;if(!key)return res.status(503).json({error:'no key'});
const b=req.body||{},line=b.line,mode=b.mode==='line'?'line':'bars';
if(typeof line!=='string'||!line.trim()||line.length>300)return res.status(400).json({error:'bad line'});
const scheme=['AABB','ABAB','ABBA','AAAA'].includes(b.scheme)?b.scheme:'AABB',n=mode==='line'?3:15;
const near=b.slant?'Near/slant rhymes are allowed.':'Prefer perfect rhymes.';
const prompt=mode==='line'?
`You are a rap/songwriting rhyme partner. The writer's line: "${line}"\nWrite ${n} different options for the NEXT line. Each must end on a word that rhymes with the last word of their line, match its syllable count and rhythm roughly, and make sense with it. ${near} Keep the same voice. Return JSON only: {"lines":[...${n} strings]}`:
`You are a rap/songwriting rhyme partner. The writer's first bar: "${line}"\nContinue with ${n} more bars (bars 2-${n+1}) so the whole verse follows the rhyme scheme ${scheme} (bar 1 is the first A). Match the syllable count and rhythm of bar 1, keep one coherent story and voice, no repeated end words, make it flow. ${near} Return JSON only: {"lines":[...${n} strings]}`;
const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
try{
const r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:1}})});
if(!r.ok)return res.status(502).json({error:'upstream '+r.status});
const j=await r.json(),t=j.candidates&&j.candidates[0]&&j.candidates[0].content.parts.map(p=>p.text||'').join('');
const o=JSON.parse(t),lines=(o.lines||[]).filter(x=>typeof x==='string'&&x.trim()).slice(0,n);
if(!lines.length)return res.status(502).json({error:'empty'});
res.status(200).json({lines});
}catch(e){res.status(502).json({error:'fail'})}
};
