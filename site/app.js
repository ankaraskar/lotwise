/* Lotwise: zero-install preliminary official zoning research.
 * No API keys, no analytics, no user data persistence, no 3rd-party search.
 * Requests go only to pinned municipal ArcGIS endpoints and static site data.
 * Survey and client brief are deliberately never transmitted.
 */
'use strict';
const $ = id => document.getElementById(id);
const TORONTO = 'https://gis.toronto.ca/arcgis/rest/services/cot_geospatial11/FeatureServer';
const TORONTO_ADDRESS = 'https://gis.toronto.ca/arcgis/rest/services/cot_geospatial27/FeatureServer/101';
// Municipal ArcGIS Online GIS item IDs, published for City of Brantford use.
const BRANTFORD = 'https://services.arcgis.com/aji2lCmjXt0KpGzI/arcgis/rest/services/';
const BRANTFORD_ADDRESS = BRANTFORD + 'OP_Site_Addresses2/FeatureServer/0';
const BRANTFORD_ZONE = BRANTFORD + 'Schedule_A_Zones/FeatureServer/0';
const OFFICIAL = ['gis.toronto.ca','www.toronto.ca','www.buildbrantford.ca','www.brantford.ca','www.ontario.ca','services.arcgis.com','brantford.maps.arcgis.com'];
const TORONTO_CR = {
  chapter: 'https://www.toronto.ca/zoning/bylaw_amendments/ZBL_NewProvision_Chapter40_10.htm',
  general: 'https://www.toronto.ca/zoning/bylaw_amendments/ZBL_NewProvision_Chapter40.htm',
  parking: 'https://www.toronto.ca/zoning/bylaw_amendments/ZBL_NewProvision_Chapter200.htm',
  exceptions: 'https://www.toronto.ca/zoning/bylaw_amendments/ZBL_NewProvision_Chapter900_11.htm',
  amendment531: 'https://www.toronto.ca/legdocs/bylaws/2022/law0595.pdf#page=13'
};
const CHECKS = [
  ['Correct property / survey','Confirm legal lot geometry, PIN, surveys'],
  ['Zoning and permitted uses','Check exact uses in official by-law'],
  ['Site-specific exceptions','Check zone suffixes, Chapter 900 or city exceptions'],
  ['Height and storeys','Check zoning, overlays and site-specific rules'],
  ['Front, rear and side yards','Verify lot-line definitions and setbacks'],
  ['FSI / lot coverage','Calculate using municipal definitions'],
  ['Parking / accessible parking','Use exact occupancy, area, exceptions'],
  ['Loading / site circulation','Review vehicle access and loading'],
  ['Landscaping / tree protection','Check local tree and landscape rules'],
  ['Heritage / flood constraints','Check property and hazard mapping'],
  ['Amendments / appeals','Check interim controls and appeals'],
  ['Ontario Building Code','Classify occupancy and refer for technical review']
];
const state = { standards:null, index:null, sources:null, municipality:'toronto', candidates:[], selected:null, zone:'', manual:false, queryUrl:'', lastLookup:'', overlays:[] };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function sourceLink(url,label='Official source ↗') {
  try { const u = new URL(url); if (u.protocol !== 'https:' || !OFFICIAL.includes(u.hostname)) return '';
    return `<a href="${esc(u.href)}" class="source-link" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
  } catch { return ''; }
}
function notice(txt){return `<div class="notice">${esc(txt)}</div>`;}
function normalizedStreet(s){const abbr={STREET:'ST',AVENUE:'AVE',ROAD:'RD',DRIVE:'DR',BOULEVARD:'BLVD',CRESCENT:'CRES',COURT:'CT',WEST:'W',EAST:'E',NORTH:'N',SOUTH:'S'};return s.split(/\s+/).map(w=>abbr[w]||w).join(' ');}
function addressParts(value){let s=String(value||'').toUpperCase().replace(/\b(?:TORONTO|BRANTFORD|ONTARIO|CANADA)\b/g,' ').replace(/[,\.]/g,' ').replace(/\s+/g,' ').trim();const m=s.match(/^(\d+[A-Z]?)\s+(.+)/);if(!m||m[2].length<3)throw Error('Enter a civic number and street name, e.g. 522 Mount Pleasant Rd.');return {number:m[1],street:normalizedStreet(m[2])};}
function sqlQuote(v){return String(v).replace(/'/g,"''");}
function serviceQuery(base,opts){ const p=new URLSearchParams({f:'json',outFields:'*',returnGeometry:'false',resultRecordCount:'25',...opts});return `${base}/query?${p.toString()}`; }
async function getGIS(url){let parsed=new URL(url);if(!['gis.toronto.ca','services.arcgis.com'].includes(parsed.hostname) || parsed.protocol!=='https:')throw Error('Blocked non-municipal GIS URL'); const controller=new AbortController(), t=setTimeout(()=>controller.abort(),19000);try{const resp=await fetch(url,{signal:controller.signal});if(!resp.ok)throw Error(`HTTP ${resp.status}`);const json=await resp.json();if(json.error)throw Error(`${json.error.message||'ArcGIS error'} ${JSON.stringify(json.error.details||[]).slice(0,180)}`);if(!Array.isArray(json.features))throw Error('GIS response is not a feature list.');return json.features;}catch(e){if(e.name==='AbortError')throw Error('The municipal GIS request timed out. Try again or use coordinates.');throw e;}finally{clearTimeout(t);}}
function parsePoint(feature){let a=feature.attributes||{}, g=feature.geometry||{};return {lat:Number(g.y ?? a.LATITUDE), lon:Number(g.x ?? a.LONGITUDE)};}
function validPoint(lat,lon,mun){if(!Number.isFinite(lat)||!Number.isFinite(lon))return false;return mun==='toronto'?(lat>43.4&&lat<44.15&&lon>-80.2&&lon<-78.8):(lat>42.9&&lat<43.35&&lon>-80.5&&lon<-79.9);}
function spatial(base,lat,lon){return serviceQuery(base,{where:'1=1',geometry:`${lon},${lat}`,geometryType:'esriGeometryPoint',inSR:'4326',spatialRel:'esriSpatialRelIntersects'});}
async function zonesAt(lat,lon,mun){let base=mun==='toronto'?TORONTO+'/18':BRANTFORD_ZONE;let query=spatial(base,lat,lon);let features=await getGIS(query);if(mun==='toronto'&&!features.length){base=TORONTO+'/3';query=spatial(base,lat,lon);features=await getGIS(query);}return {features,query};}
function findZone(mun,features){return [...new Set(features.map(f=>{const a=f.attributes||{};return mun==='toronto'?a.ZN_STRING||a.ZN_ZONE||a.ZONE_LABEL:a.ZoneLabel||a.ZN_STRING;}).filter(Boolean))].join(' / ');}
async function findToronto(addr){const {number,street}=addressParts(addr), first=street.split(' ')[0];let points=[];for(const cond of [`UPPER(LINEAR_NAME_FULL) = '${sqlQuote(street)}'`,`UPPER(LINEAR_NAME_FULL) LIKE '${sqlQuote(first)}%'`]){const query=serviceQuery(TORONTO_ADDRESS,{where:`ADDRESS_NUMBER = '${sqlQuote(number)}' AND ${cond}`,returnGeometry:'true',outSR:'4326',resultRecordCount:'25'});points=await getGIS(query);if(points.length)break;}points.sort((a,b)=>Number(String(a.attributes?.LINEAR_NAME_FULL||'').toUpperCase()!==street)-Number(String(b.attributes?.LINEAR_NAME_FULL||'').toUpperCase()!==street));return points.slice(0,10).map(p=>({address:p.attributes?.ADDRESS_FULL||`${number} ${p.attributes?.LINEAR_NAME_FULL||street}`, ...parsePoint(p)}));}
async function findBrantford(addr){const {number,street}=addressParts(addr);const tokens=street.split(' ');const roadTypes=['ST','AVE','RD','DR','BLVD','CRES','CT','LANE'];const rt=roadTypes.includes(tokens[tokens.length-1])?tokens.pop():'';const name=tokens.join(' ');const where=`STREETNUM = '${sqlQuote(number)}' AND UPPER(STREETNAME) = '${sqlQuote(name)}'`;
 const query=serviceQuery(BRANTFORD_ADDRESS,{where,returnGeometry:'true',outSR:'4326'});const points=await getGIS(query);return points.filter(p=>!rt||String(p.attributes?.STREETTYPE||'').toUpperCase()===rt).slice(0,10).map(p=>({address:p.attributes?.FULLADDRESS||addr,...parsePoint(p)}));}
function setStatus(text,type='neutral'){$('queryStatus').innerHTML=type==='error'?`<div class="search-error">${esc(text)}</div>`:`<div class="empty-state"><span class="empty-icon">⌁</span><h3>${esc(text)}</h3></div>`;}
function drawCandidates(){const root=$('candidateList');root.innerHTML='';if(!state.candidates.length){ $('resultTag').textContent='NO MATCH';setStatus('No address candidate found. Check the address or use coordinates. A missing record does not mean that there are no zoning restrictions.','error');return; }
 $('queryStatus').innerHTML='';$('resultTag').textContent=`${state.candidates.length} CANDIDATE${state.candidates.length===1?'':'S'}`;
 state.candidates.forEach((c,i)=>{const div=document.createElement('div');div.className='candidate';const z=c.error?'GIS layer error':(c.zone||'Zoning not returned');div.innerHTML=`<div class="candidate-head"><h3>${esc(c.address)}</h3><span class="tag ${c.zone?'tag-neutral':'tag-warn'}">${esc(z)}</span></div><div class="mini-label">${Number.isFinite(c.lat)?`${c.lat.toFixed(6)}, ${c.lon.toFixed(6)}`:'Coordinates unavailable'} · Official address point</div>${c.error?notice('Zoning polygon query failed: '+c.error):''}<div class="candidate-info">${sourceLink(c.query,'View official GIS query ↗')}</div><button type="button" data-candidate="${i}">${state.selected===i?'✓ Property confirmed':'Confirm this property →'}</button>`;root.appendChild(div);});
 root.querySelectorAll('[data-candidate]').forEach(b=>b.addEventListener('click',()=>chooseCandidate(Number(b.dataset.candidate))));}
function reset(){state.candidates=[];state.selected=null;state.zone='';state.manual=false;state.overlays=[];$('candidateList').innerHTML='';$('zoneDetail').innerHTML='';$('resultTag').textContent='SEARCHING';$('standardsTag').textContent='AWAITING ZONING';$('standardsContent').textContent='Select the correct property to see available reference provisions.';snapshot('','','','');drawChecks();}
async function lookup(e){e.preventDefault();const mun=$('municipality').value, addr=$('address').value.trim();if(!addr&&!($('lat').value&&$('lon').value)){setStatus('Enter a property address or valid coordinates.','error');return;}
 state.municipality=mun;state.lastLookup=new Date().toISOString();reset();const button=$('submitBtn');button.disabled=true;button.querySelector('span').textContent='Consulting official GIS…';
 try {let coords=[]; if($('lat').value&&$('lon').value){coords=[{address:addr||'Manual coordinates',lat:Number($('lat').value),lon:Number($('lon').value)}];}else{coords=mun==='toronto'?await findToronto(addr):await findBrantford(addr);}
 const matching=coords.filter(p=>validPoint(p.lat,p.lon,mun));if(coords.length&&!matching.length)throw Error('The official address point was outside the expected municipality. Check your input.');
 state.candidates=await Promise.all(matching.map(async p=>{try{const result=await zonesAt(p.lat,p.lon,mun);return {...p,features:result.features,query:result.query,zone:findZone(mun,result.features)};}catch(e){return {...p,features:[],zone:'',query:'',error:e.message};}}));drawCandidates();
 }catch(e){$('resultTag').textContent='QUERY FAILED';setStatus('Official GIS lookup failed: '+e.message+'. The property remains unverified; you can use coordinates or a manually entered zoning label for reference only.','error');}
 finally{button.disabled=false;button.querySelector('span').textContent='Search official GIS';}
}
async function chooseCandidate(index){state.selected=index;state.manual=false;state.zone=state.candidates[index]?.zone||'';drawCandidates();drawZone();renderStandards();drawChecks();await fetchOverlays(state.candidates[index]);}
function drawZone(){const c=state.candidates[state.selected];if(!c)return;let details=(c.features||[]).map(f=>JSON.stringify(f.attributes||{},null,2)).join('\n');$('zoneDetail').innerHTML=`<div class="result-grid"><div class="result-cell"><small>Confirmed address candidate</small><strong>${esc(c.address)}</strong></div><div class="result-cell"><small>Official zoning label</small><strong>${esc(state.zone||'Not returned')}</strong></div></div>${notice('Address-point zoning intersection only. Confirm the legal parcel boundary, all applicable exceptions, overlays, amendments, appeals and building use.')}${sourceLink(c.query,'Official zoning GIS response ↗')}<details class="coord-details"><summary>View raw zoning attributes</summary><pre class="raw-data">${esc(details)}</pre></details><div id="overlayOut" class="overlay-output"><div class="mini-label">Checking related GIS layers…</div></div>`;}
async function fetchOverlays(candidate){if(!validPoint(candidate.lat,candidate.lon,state.municipality))return;const mun=state.municipality;const layers=mun==='toronto'?[['Height overlay',TORONTO+'/9'],['Lot coverage',TORONTO+'/10'],['Policy area',TORONTO+'/13']]:[['Parking exceptions (Schedule D)',BRANTFORD+'Schedule_G_Parking/FeatureServer/0'],['Flood overlay (Schedule B)',BRANTFORD+'Schedule_B_Flood/FeatureServer/0']];
 const rows=await Promise.all(layers.map(async ([label,url])=>{let query=spatial(url,candidate.lat,candidate.lon);try{const features=await getGIS(query);return {label,query,features,kind:features.length?'found':'none'};}catch(e){return {label,query,kind:'error',error:e.message};}}));if(state.candidates[state.selected]!==candidate)return;state.overlays=rows;const node=$('overlayOut');if(!node)return;node.innerHTML='<h3 class="subheading">Related official map layers</h3>'+rows.map(row=>`<div class="reference-row"><span>${esc(row.label)}</span><strong>${row.kind==='found'?`${row.features.length} record(s)${row.label==='Height overlay' && row.features[0]?.attributes?.HT_HEIGHT != null ? ' · '+esc(row.features[0].attributes.HT_HEIGHT)+' m' : ''}`:(row.kind==='none'?'No point intersection':'Query unavailable')}</strong></div>${row.kind==='found'?`<details class="coord-details"><summary>View official attributes</summary><pre class="raw-data">${esc(JSON.stringify(row.features.map(f=>f.attributes),null,2))}</pre></details>`:''}${row.kind==='error'?`<div class="mini-label">${esc(row.error)}</div>`:''}${sourceLink(row.query,'Open layer query ↗')}`).join('')+notice('A GIS layer with zero point intersections does not establish that the regulation is inapplicable.');renderStandards();drawChecks();}
function setManual(){const z=$('manualZone').value.toUpperCase().trim();if(!/^[A-Z0-9()\s.\-]{1,32}$/.test(z)){setStatus('Enter a short zoning label such as MCC or CR SS2 (x531).','error');return;}state.selected=null;state.zone=z;state.manual=true;state.municipality=$('municipality').value;$('zoneDetail').innerHTML=notice(`Manually entered zoning label “${z}” — not verified against a property. Use for provision research only.`);renderStandards();drawChecks();}
function useGuess(raw){
  const t=String(raw||'').trim().toLowerCase();
  if(!t)return '';
  // Specific classifications first. Ambiguous or mixed-use text is never assigned a rate.
  if(/\b(and|plus|mixed[- ]use|with|\/)\b/i.test(t))return '';
  if(/^(?:automobile|auto|car)\s+(?:sales|dealership|dealer)/.test(t)||/^(?:toyota|honda|volkswagen|vw)\s+dealership/.test(t))return 'auto_sales';
  if(/^(?:automobile|auto|car)\s+(?:repair|service|garage)/.test(t))return 'auto_repair';
  if(/^(?:medical|doctor)\s+office$|^medical clinic$/.test(t))return 'medical';
  if(/^office(?:,? general)?$|^general office$/.test(t))return 'office';
  if(/^restaurant$|^cafe$|^caf[ée]$/.test(t))return 'restaurant';
  if(/^retail(?: store)?$|^shop$/.test(t))return 'retail';
  if(/^community (?:centre|center|hall)$/.test(t))return 'community';
  if(/^studio$|^artist studio$/.test(t))return 'studio';
  if(/^warehouse$/.test(t))return 'warehouse';
  return '';
}
function parkingFields(){
  const id=$('parkingUse').value;
  $('serviceBaysField').classList.toggle('hidden',!['auto_sales','auto_repair'].includes(id));
  const gfaLabel=document.querySelector('label[for="gfa"]');
  if(gfaLabel)gfaLabel.textContent=id==='auto_sales'?'Non-service GFA (m²)':'Proposed GFA (m²)';
}
function autoParking(){
  if(state.municipality!=='brantford'||!state.standards)return;
  const id=useGuess($('use').value);
  $('parkingUse').value=[...$('parkingUse').options].some(o=>o.value===id)?id:'';
  parkingFields();renderStandards();
}
const OBC = Object.freeze({
 scope:'https://www.ontario.ca/document/2024-building-code-compendium/part-1-compliance',
 part3:'https://www.ontario.ca/document/2024-building-code-compendium/part-3-fire-protection-occupant-safety-and-accessibility',
 part9:'https://www.ontario.ca/document/2024-building-code-compendium/part-9-housing-and-small-buildings',
 current:'https://www.ontario.ca/laws/regulation/240163'
});
function regCard(label,value,caption,status='REVIEW',primary=false){
 return `<div class="reg-card ${primary?'primary':''}"><div class="reg-card-top"><span>${esc(label)}</span><small>${esc(status)}</small></div><div class="reg-value">${esc(value)}</div><p>${esc(caption)}</p></div>`;
}
function ruleRow(label,value){return `<div class="rule-row"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;}
function numberField(id){const v=$(id)?.value?.trim();return v!==''&&v!==undefined&&Number.isFinite(Number(v))?Number(v):null;}
function snapshot(zone,height,setbacks,parking){
 const cells=[['ZONING',zone||'—',zone?'Official GIS label; verify lot':'Not searched'],['HEIGHT',height||'—',height?'Base rule / overlay; exceptions pending':'Not established'],['SETBACKS',setbacks||'—',setbacks?'General zone rule; conditional':'Context not established'],['PARKING',parking||'—',parking?'Base rate / preliminary only':'Use and area required']];
 const root=$('snapshotGrid'); if(!root)return;
 root.innerHTML=cells.map(([name,value,note])=>`<div class="snap"><span>${esc(name)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`).join('');
 $('snapshotStatus').textContent=zone?(state.manual?'MANUAL ZONE · UNVERIFIED':'OFFICIAL GIS · PRELIMINARY'):'AWAITING PROPERTY';
}
function torontoData(zone){
 const m=zone.match(/\bCR\s+SS([1-5])\b/i);if(!m)return null;
 const standard=m[1], exception=zone.match(/\(x(\d+)\)/i)?.[1]||'',height=state.overlays.find(x=>x.label==='Height overlay');
 const a=height?.features?.[0]?.attributes||{};
 const rawHeight=height?.features?.length===1&&a.HT_HEIGHT!=null&&Number.isFinite(Number(a.HT_HEIGHT))&&Number(a.HT_HEIGHT)>0?`${a.HT_HEIGHT} m`:null;
 let heightValue=rawHeight||'See official overlay',heightNote='GIS height overlay is not available or contains multiple records.';
 if(rawHeight)heightNote='HT_HEIGHT from Toronto official GIS. Subject to site-specific exceptions.';
 if(!rawHeight&&height?.kind==='none'&&standard==='2'){
   heightValue='14 m*';heightNote='SS2 fallback only if there is no numerical HT value; verify the complete overlay and exceptions.';
 }
 if(!rawHeight&&height?.kind!=='none'&&standard==='2')heightNote='CR SS2 uses HT overlay; 14 m only applies if no numeric HT value exists.';
 const storeys=a.HT_STORIES!=null?`${a.HT_STORIES} (raw GIS)`:'Not established';
 return {standard,exception,heightValue,heightNote,storeys};
}
function parkingData(){
 if(state.municipality!=='brantford')return {value:'Review required',subtitle:'See official Chapter 200 / proposed use',detail:''};
 const table=state.standards?.brantford_parking;
 const id=$('parkingUse').value, chosen=(table?.rates||[]).find(r=>r.id===id);
 if(!chosen)return {value:'Use needed',subtitle:'Select the proposed use classification',detail:'Parking Schedule D with no point intersection does not mean zero parking.'};
 const gfa=numberField('gfa'),bays=numberField('serviceBays');
 let rate='',math='',count=null;
 if(chosen.formula==='service_bays_only'){
   rate=`${chosen.service_bay_rate} / service bay`;
   if(bays!==null&&Number.isInteger(bays)&&bays>=0){count=bays*chosen.service_bay_rate;math=`${bays} bays × ${chosen.service_bay_rate}`;}
 }else if(chosen.formula==='non_service_gfa_plus_service_bays'){
   rate=`1 / ${chosen.m2_per_space} m² + ${chosen.service_bay_rate} / bay`;
   if(gfa!==null&&bays!==null&&Number.isInteger(bays)&&bays>=0){count=gfa/chosen.m2_per_space+bays*chosen.service_bay_rate;math=`${gfa} m² ÷ ${chosen.m2_per_space} + ${bays} bays × ${chosen.service_bay_rate}`;}
 }else{
   rate=`1 / ${chosen.m2_per_space} m² GFA`;
   if(gfa!==null){count=gfa/chosen.m2_per_space;math=`${gfa} m² ÷ ${chosen.m2_per_space}`;}
 }
 return {value:rate,subtitle:`${chosen.label} · Table 5.3.a`,count,math,chosen,detail:chosen.note||'',source:table?.source_url};
}
function renderStandards(){
 const root=$('standardsContent'),mun=state.municipality,z=state.zone,dataset=state.standards||{};
 const parking=parkingData();
 if(!z){$('standardsTag').textContent='AWAITING ZONING';root.innerHTML='<div class="empty-compact">Select an official property result. Reference values are never interpreted as final building permissions.</div>';snapshot('','','','');return;}
 const matched=mun==='brantford'?Object.entries(dataset[mun]||{}).find(([key])=>new RegExp('(^|[^A-Z0-9])'+key+'([^A-Z0-9]|$)','i').test(z)):null;
 const tor=mun==='toronto'?torontoData(z):null;
 $('standardsTag').textContent=state.manual?'MANUAL · UNVERIFIED':matched||tor?'BASE RULES · VERIFY EXCEPTIONS':'RESEARCH REQUIRED';
 let out=`<div class="reg-hero"><strong>${esc(z)} ${matched?'· '+esc(matched[1].zone_name):tor?'· Commercial Residential':''}</strong><small>${state.manual?'Manually supplied zone · NOT confirmed against a property':'Official address-point zoning intersection · site-specific regulations pending'}</small></div>`;
 let height='',setbacks='',parkText=parking.value,ruleHtml='';
 if(matched){
  const [code,rule]=matched,type=$('buildingType').value,cols=rule.columns?.[type]||{};
  height=cols['Maximum building height']||'Not indexed';setbacks=cols['Minimum front yard']||'Varies';
  ruleHtml+=`<div class="rule-section"><h3>Building envelope · ${esc(type==='non_residential'?'Non-residential uses':'Mixed-use / Residential uses')}</h3>`;
  for(const [key,val] of Object.entries(cols))ruleHtml+=ruleRow(key,val);
  ruleHtml+=`<p class="rule-foot">${esc(rule.footnotes||'')}</p><p class="rule-foot">${(rule.notes||[]).map(esc).join(' ')}</p>${sourceLink(rule.source_url,'Official Brantford Table 6.6.1 ↗')}</div>`;
 }else if(tor){
  height=tor.heightValue;setbacks=tor.standard==='2'?'Conditional SS2':'See Chapter 40';
  ruleHtml+=`<div class="rule-section"><h3>Toronto CR development standard set ${esc(tor.standard)}</h3>`;
  ruleHtml+=ruleRow('Maximum height',tor.heightValue)+`<p class="rule-foot">${esc(tor.heightNote)}</p>`+ruleRow('Maximum storeys',tor.storeys);
  if(tor.standard==='2'){
   ruleHtml+=ruleRow('Front main wall','≥75% within 0–3 m of front lot line')+ruleRow('Rear main wall','7.5 m*')+ruleRow('Side wall with openings','5.5 m* from applicable interior lot line')+ruleRow('Side wall without openings','3.0 m* when abutting residential zones')+`<p class="rule-foot">*Conditional: lane location, side-wall openings, adjacent zoning, 45° angular plane and other detailed provisions affect the result. See 40.10.40.70(2). These are NOT unconditional minimum setbacks.</p>`;
  }else ruleHtml+=ruleRow('Setbacks',`Apply Chapter 40.10.40.70 — SS${tor.standard} conditions`);
  ruleHtml+=ruleRow('Permitted uses','Review 40.10.20 and relevant use conditions')+ruleRow('Vehicle parking','Review Chapter 200 for use-specific rate and exceptions');
  ruleHtml+=`<div class="reference-source">${sourceLink(TORONTO_CR.chapter,'Official Chapter 40.10 ↗')}${sourceLink(TORONTO_CR.parking,'Official Chapter 200 ↗')}</div></div>`;
  if(tor.exception){
    ruleHtml+=`<div class="caution"><b>Site-specific exception x${esc(tor.exception)}</b> — Review Chapter 900.11.10(${esc(tor.exception)}) and original amendments before relying on any base-zone metric. ${tor.exception==='531'?'Related regulations 729, 731, 732, 733 and 735 also require review.':''}</div><div class="reference-source">${sourceLink(TORONTO_CR.exceptions,'Official Chapter 900 ↗')}${tor.exception==='531'?sourceLink(TORONTO_CR.amendment531,'Official amending By-law 595-2022 ↗'):''}</div>`;
  }
 }else{
  height='Not indexed';setbacks='Not indexed';ruleHtml+='<div class="notice">No reviewed structured rules currently exist for this zoning label. Use the official indexed sources; do not infer that the site is unrestricted.</div>';
 }
 out+=`<div class="reg-grid">`+regCard('Maximum height',height,tor?'Height overlay / chapter 40.10 · exception review needed':matched?'Base zone, type-specific; other provisions may vary':'Official reference required',matched?'BASE / CONDITIONAL':'REVIEW',true)+regCard('Setbacks',setbacks,tor?'Front / rear / side depend on exact conditions':matched?'Front yard shown; see full yard table below':'Survey & zoning review required','CONDITIONAL')+regCard('Parking',parkText,mun==='toronto'?'Use-based rate not yet structured for this zone':parking.subtitle,parking.chosen?'BASE RATE':'REVIEW')+regCard('Coverage / FSI',mun==='toronto'?'Review overlays':'Review other rules','Not established as a final allowance by address-point query','REVIEW')+`</div>`;
 out+=ruleHtml;
 if(mun==='brantford'){
   out+=`<div class="rule-section"><h3>Vehicle parking · Table 5.3.a (non-residential)</h3>`;
   if(parking.chosen){
     out+=ruleRow('Use classification',parking.chosen.label)+ruleRow('Published base rate',parking.value);
     if(parking.count!==null&&Number.isFinite(parking.count))out+=`<div class="use-calc"><div class="mini-label">INDICATIVE ONLY · UNROUNDED</div><div class="calc-value">${esc(parking.count.toFixed(2))} spaces</div><p>${esc(parking.math)}. Accessible spaces, rounding, mixed uses, Schedule D, amendments and exceptions NOT applied.</p></div>`;
     else out+='<p class="rule-foot">Enter the required GFA and/or service bays above to calculate base-rate arithmetic. An unrounded value is not the final required count.</p>';
     if(parking.detail)out+=`<p class="rule-foot">${esc(parking.detail)}</p>`;
   }else out+='<p class="rule-foot">Choose a parking classification in Project parameters. A zoning code alone cannot establish the parking count.</p>';
   out+=`<p class="rule-foot">Check Schedule D, accessible parking, all amendments and proposed land-use definitions.</p>${sourceLink(dataset.brantford_parking?.source_url,'Official Brantford Section 5 ↗')}</div>`;
 }
 out+='<div class="caution"><b>Preliminary evidence only.</b> Zoning approval is not established. Confirm all site-specific exceptions, amendments, appeals, the survey and exact land-use classification.</div>';
 root.innerHTML=out;
 snapshot(z,height,setbacks,mun==='brantford'?parking.value:'Use-specific');
}
function renderOBC(){
 const occ=$('obcOccupancy').value,scope=$('obcProject').value,storeys=numberField('obcStoreys'),area=numberField('obcArea');
 const target=$('obcOutcome'),checks=$('obcChecks');let label='Inputs required',text='Enter the major occupancy, OBC building height (storeys) and building area. Building area is not total GFA.',warn=false;
 if(scope!=='new'){
   label='Alteration / addition review';text='Existing building provisions, change-of-use and applicable Part 11 or other requirements require a project-specific review. New-building Part 9 screening alone is insufficient.';warn=true;
 }else if(occ&&storeys!==null&&area!==null){
   if(!Number.isInteger(storeys)||storeys<1||area<=0){label='Check input values';text='Building height must be whole storeys and building area must be positive.';warn=true;}
   else if(occ==='mixed'||occ==='B'||occ==='A'||occ==='F1'){
     label='Part 3 / occupancy review';text='This selected major occupancy is not among the straightforward Part 9 occupancy classes in Division A Article 1.3.3.3. Confirm the actual classification, mixed occupancies and any special provisions.';warn=true;
   }else if(storeys>3||area>600){label='Part 3 review indicated';text=`${storeys} storeys and ${area} m² building area. The general Part 9 scope threshold is 3 storeys or fewer AND building area not exceeding 600 m²; check Division A and the complete project scope.`;warn=true;
   }else{
     label='Potential Part 9 pathway';text=`${storeys} storeys, ${area} m² building area, selected Group ${occ}. These inputs appear within the general Part 9 screen under Division A 1.3.3.3, SUBJECT TO exceptions, exact occupancy and building configuration. This is not a classification or approval.`;
   }
 }
 target.innerHTML=`<div class="obc-result ${warn?'warning':''}"><small>PRELIMINARY CODE ROUTE · NOT A COMPLIANCE VERDICT</small><strong>${esc(label)}</strong><p>${esc(text)}</p></div>`;
 const topics=[['Major occupancy & mixed uses','Confirm Group A–F classifications and use definitions.'],['Building height / building area','Use OBC definitions; do not equate GFA to building area.'],['Combustible / noncombustible','Review permitted construction type and fire-resistance ratings.'],['Occupant load & exits','Calculate loads, exit quantity, widths, travel distances.'],['Barrier-free design','Review accessible entrances, paths and facilities.'],['Spatial separation','Review limiting distance, exposing building face and openings.'],['Building services','Review HVAC, plumbing, energy compliance and fire protection.'],['Amendments & scope','Confirm applicable current O. Reg. 163/24 amendments and Part 11 where relevant.']];
 checks.innerHTML=topics.map(([name,hint])=>`<div class="obc-check"><span>◇</span><div><strong>${esc(name)}</strong><small>${esc(hint)}</small></div></div>`).join('');
}
function drawChecks(){const confirmed=state.selected!==null&&!state.manual, hasRef=Boolean(state.zone&&state.standards?.[state.municipality]&&Object.keys(state.standards[state.municipality]).some(z=>state.zone.includes(z)));
 $('checkGrid').innerHTML=CHECKS.map(([label,explanation],i)=>`<div class="check-item"><span>${esc(label)}<small class="mini-label check-hint">${esc(explanation)}</small></span><span>${i===0&&confirmed?'POINT MATCH':i===3&&hasRef?'BASE TABLE':'TO REVIEW'}</span></div>`).join('');}
async function loadIndex(){let base='./data/';const load=async n=>{let r=await fetch(base+n,{cache:'no-store'});if(!r.ok)throw Error('Could not load '+n);return r.json();};try{const [sources,standards,index,status]=await Promise.all(['sources.json','standards.json','index.json','status.json'].map(load));state.sources=sources;state.standards=standards;state.index=index;$('sourceIndexStatus').textContent=status.status||'Not indexed';$('lastSync').textContent=index.generated_at?new Date(index.generated_at).toLocaleDateString():'Not indexed';$('excerptCount').textContent=String(index.snippets?.length||0);$('syncIndicator').textContent=status.status==='indexed'?'Sources indexed':status.status==='partial'?'Partial source index':'Index pending';$('sourceWarnings').textContent=status.warnings?.length?status.warnings.join(' · '):'Index excerpts are research navigation only; current GIS and amendments still require verification.';updateParking();renderLibrary();}catch(e){$('syncIndicator').textContent='Offline index';$('sourceIndexStatus').textContent='Unable to load';$('sourceWarnings').textContent='Data files could not be loaded. If opened as file://, use GitHub Pages instead of double-clicking index.html.';}}
function updateParking(){const select=$('parkingUse'), old=select.value;select.innerHTML='<option value="">Select a use / not specified</option>'+(state.municipality==='brantford'?(state.standards?.brantford_parking?.rates||[]).map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join(''):'');if([...select.options].some(o=>o.value===old))select.value=old;else select.value=useGuess($('use').value);parkingFields();}
let activeFilter='all';function renderLibrary(){const all=state.index?.snippets||[], query=$('docSearch').value.trim().toLowerCase();const filtered=all.filter(x=>(activeFilter==='all'||x.jurisdiction===activeFilter)&&(!query||`${x.title} ${x.excerpt}`.toLowerCase().includes(query))).slice(0,80);
 $('docResults').innerHTML=filtered.length?filtered.map(item=>`<article class="doc-card"><div class="meta">${esc(item.jurisdiction?.toUpperCase()||'OFFICIAL')} · ${item.content_type==='html'?'TEXT BLOCK':'PDF PAGE'} ${esc(item.page)}</div><h3>${esc(item.title)}</h3><p>${esc(item.excerpt)}</p>${sourceLink(item.source_url,'Open original official document ↗')}</article>`).join(''):`<div class="empty-state"><h3>${all.length?'No matching official excerpts':'No official document index yet'}</h3><p>${all.length?'Try a broader phrase; indexing is selective, not a complete by-law search.':'The first GitHub Actions run needs to download and index official documents. It may take several minutes.'}</p></div>`;}
function nav(view){for(const el of document.querySelectorAll('[data-view]'))el.classList.toggle('active',el.dataset.view===view);for(const v of ['study','research','method'])$(v+'View').classList.toggle('hidden',v!==view);$('breadcrumb').textContent=({study:'FEASIBILITY STUDY',research:'OFFICIAL SOURCE LIBRARY',method:'METHOD & LIMITATIONS'})[view];}
function start(){renderOBC();snapshot('','','','');document.querySelectorAll('[data-view]').forEach(e=>e.addEventListener('click',()=>nav(e.dataset.view)));$('studyForm').addEventListener('submit',lookup);$('manualBtn').addEventListener('click',setManual);$('exportBtn').addEventListener('click',()=>window.print());$('municipality').addEventListener('change',()=>{state.municipality=$('municipality').value;reset();updateParking();});$('buildingType').addEventListener('change',renderStandards);['obcOccupancy','obcProject','obcStoreys','obcArea'].forEach(id=>$(id).addEventListener('input',renderOBC));$('parkingUse').addEventListener('change',()=>{parkingFields();renderStandards();});$('use').addEventListener('change',autoParking);$('use').addEventListener('blur',autoParking);$('serviceBays').addEventListener('input',renderStandards);$('gfa').addEventListener('input',renderStandards);$('docSearch').addEventListener('input',renderLibrary);document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));renderLibrary();}));drawChecks();loadIndex();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
