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
function reset(){state.candidates=[];state.selected=null;state.zone='';state.manual=false;state.overlays=[];$('candidateList').innerHTML='';$('zoneDetail').innerHTML='';$('resultTag').textContent='SEARCHING';$('standardsTag').textContent='AWAITING ZONING';$('standardsContent').textContent='Select the correct property to see available reference provisions.';drawChecks();}
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
function torontoCrReference(zone){
  const m=zone.match(/\bCR\s+SS([1-5])\b/i);if(!m)return '';
  const set=m[1];const height=state.overlays.find(x=>x.label==='Height overlay');
  const a=height?.features?.[0]?.attributes||{};
  let heightLabel='Not established – inspect current Height Overlay';
  if(height?.features?.length===1 && a.HT_HEIGHT != null && Number.isFinite(Number(a.HT_HEIGHT)) && Number(a.HT_HEIGHT)>0)heightLabel=`${a.HT_HEIGHT} m (GIS HT_HEIGHT, verify exception)`;
  else if(height?.kind==='none'&&set==='2')heightLabel='No point intersection — 14.0 m is only a conditional fallback';
  const exception=zone.match(/\(x(\d+)\)/i)?.[1];
  let result=`<h3 class="subheading">CR · Commercial Residential (SS${esc(set)})</h3>
    <div class="mini-label">Official By-law 569-2013 · Chapter 40.10; applicability and special provisions require review</div>
    <div class="reference-row"><span>Height overlay</span><strong>${esc(heightLabel)}</strong></div>
    ${a.HT_STORIES != null ? `<div class="reference-row"><span>Overlay storeys (raw GIS)</span><strong>${esc(a.HT_STORIES)}</strong></div>` : ''}
    ${set==='2'?'<div class="reference-footnote">CR SS2 general height rule: Chapter 40.10.40.10(2) uses the HT overlay value; 14.0 m is a fallback only where there is no HT numerical value. Site-specific exceptions may change the outcome.</div>':''}
    <div class="reference-row"><span>Building setbacks</span><strong>Context-dependent · 40.10.40.70</strong></div>
    <div class="reference-row"><span>Permitted uses</span><strong>Check 40.10.20 and conditions</strong></div>
    <div class="reference-row"><span>Parking</span><strong>Check Chapter 200 + actual use</strong></div>
    <div class="reference-footnote">Not a zoning compliance determination: setbacks depend on lot-line type, adjacent uses and openings. Zoning label alone is insufficient for an exact parking total.</div>
    <div class="reference-source">${sourceLink(TORONTO_CR.chapter,'Official CR zone regulations ↗')} ${sourceLink(TORONTO_CR.parking,'Official parking regulations ↗')}</div>`;
  if(exception){
    result+=`<div class="notice"><strong>Site-specific exception (x${esc(exception)}) identified.</strong> Chapter 900.11.10(${esc(exception)}) must be reviewed together with its cross-referenced provisions; do not treat the base table as final.</div>
    <div class="reference-source">${sourceLink(TORONTO_CR.exceptions,'Official CR exceptions ↗')}${exception==='531'?sourceLink(TORONTO_CR.amendment531,'By-law 595-2022 (CR 531) ↗'):''}</div>`;
    if(exception==='531')result+=`<div class="reference-footnote">CR 531 refers to additional regulations 729, 731, 732, 733 and 735. These may affect building form, permitted floor area and other design constraints. The consolidation and any later amendments or appeals must be checked.</div>`;
  }
  return result;
}
function renderStandards(){
 const root=$('standardsContent'),mun=state.municipality,z=state.zone,dataset=state.standards||{};
 if(!z){$('standardsTag').textContent='NOT ESTABLISHED';root.innerHTML=notice('No verified zoning label returned. Zoning standards cannot be concluded.');return;}
 const matched=Object.entries(dataset[mun]||{}).find(([key])=>new RegExp('(^|[^A-Z0-9])'+key+'([^A-Z0-9]|$)','i').test(z));
 const parking=mun==='brantford'?dataset.brantford_parking:null;
 const toronto=mun==='toronto'?torontoCrReference(z):'';
 $('standardsTag').textContent=state.manual?'MANUAL / UNVERIFIED':(matched?'GENERAL TABLE ONLY':toronto?'OFFICIAL RULE REFERENCES':'RESEARCH REQUIRED');
 let out=`<div class="reference-row"><span>Property zoning</span><strong>${esc(z)}</strong></div>`;
 if(matched){const [code,rule]=matched,type=$('buildingType').value,columns=rule.columns?.[type]||{};
  out+=`<h3 class="subheading">${esc(code)} · ${esc(rule.zone_name)}</h3><div class="mini-label">${esc(rule.source_section||'Curated official reference')}</div>`;
  for(const [key,v] of Object.entries(columns))out+=`<div class="reference-row"><span>${esc(key)}</span><strong>${esc(v)}</strong></div>`;
  out+=`<div class="reference-footnote">${esc(rule.footnotes||'')}${(rule.notes||[]).map(x=>`<p>${esc(x)}</p>`).join('')}</div><div class="reference-source">${sourceLink(rule.source_url,'View official table ↗')}</div>`;
 }else if(toronto)out+=toronto;
 else out+=notice('No reviewed structured standards for this zone yet. Use the official source library. Missing data does not mean unrestricted development.');
 if(parking){
  const id=$('parkingUse').value,chosen=(parking.rates||[]).find(r=>r.id===id),gfa=Number($('gfa').value),bays=Number($('serviceBays').value);
  out+=`<h3 class="subheading">Parking · Brantford Table 5.3.a</h3>`;
  if(chosen){
    const label=chosen.formula==='service_bays_only'?`${chosen.service_bay_rate} spaces / service bay`:chosen.formula==='non_service_gfa_plus_service_bays'?`1 / ${chosen.m2_per_space} m² non-service GFA + ${chosen.service_bay_rate} / bay`:`1 / ${chosen.m2_per_space} m² GFA`;
    out+=`<div class="reference-row"><span>${esc(chosen.label)}</span><strong>${esc(label)}</strong></div>`;
    if(chosen.note)out+=`<div class="reference-footnote">${esc(chosen.note)}</div>`;
    const hasGfa=$('gfa').value!==''&&Number.isFinite(gfa)&&gfa>=0,hasBays=$('serviceBays').value!==''&&Number.isInteger(bays)&&bays>=0;
    let count=null,math='';
    if(chosen.formula==='service_bays_only'&&hasBays){count=bays*chosen.service_bay_rate;math=`${bays} bays × ${chosen.service_bay_rate} spaces/bay`;}
    else if(chosen.formula==='non_service_gfa_plus_service_bays'&&hasGfa&&hasBays){count=gfa/chosen.m2_per_space+bays*chosen.service_bay_rate;math=`${gfa} m² ÷ ${chosen.m2_per_space} + ${bays} bays × ${chosen.service_bay_rate}`;}
    else if(!chosen.formula&&hasGfa){count=gfa/chosen.m2_per_space;math=`${gfa} m² ÷ ${chosen.m2_per_space} m²/space`;}
    if(count!==null)out+=`<div class="use-calc"><div class="mini-label">Base-rate arithmetic · not final parking requirement</div><div class="calc-value">${esc(count.toFixed(2))} spaces (unrounded)</div><p>${esc(math)}. Rounding, mixed uses, accessible spaces, Schedule D, site-specific exceptions and amendments have NOT been applied.</p></div>`;
    else out+=`<div class="mini-label">${chosen.formula?'Enter the necessary non-service GFA and/or number of service bays to estimate the base rate.':'Enter the proposed GFA to calculate a preliminary base rate.'}</div>`;
  }else{
    out+=`<div class="notice">Parking classification not established. Enter a single clear proposed use above or select the corresponding classification. A zoning label alone cannot determine parking.</div>`;
    out+=`<div class="reference-footnote"><strong>Common table rates (reference only):</strong> Office 1/30 m² GFA · Restaurant 1/10 m² GFA · Retail 1/30 m² GFA · Automobile sales 1/30 m² non-service GFA plus 4/service bay.</div>`;
  }
  out+=`<div class="reference-footnote">${esc(parking.warning||'')} ${sourceLink(parking.source_url,'Official Section 5 parking tables ↗')}</div>`;
 }
 out+=notice('These are source-backed preliminary references, NOT a property-specific compliance determination. Confirm all exemptions, exceptional provisions, amendments, appeals, proposed uses and survey boundaries.');root.innerHTML=out;
}

function drawChecks(){const confirmed=state.selected!==null&&!state.manual, hasRef=Boolean(state.zone&&state.standards?.[state.municipality]&&Object.keys(state.standards[state.municipality]).some(z=>state.zone.includes(z)));
 $('checkGrid').innerHTML=CHECKS.map(([label,explanation],i)=>`<div class="check-item"><span>${esc(label)}<small class="mini-label check-hint">${esc(explanation)}</small></span><span>${i===0&&confirmed?'POINT MATCH':i===3&&hasRef?'BASE TABLE':'TO REVIEW'}</span></div>`).join('');}
async function loadIndex(){let base='./data/';const load=async n=>{let r=await fetch(base+n,{cache:'no-store'});if(!r.ok)throw Error('Could not load '+n);return r.json();};try{const [sources,standards,index,status]=await Promise.all(['sources.json','standards.json','index.json','status.json'].map(load));state.sources=sources;state.standards=standards;state.index=index;$('sourceIndexStatus').textContent=status.status||'Not indexed';$('lastSync').textContent=index.generated_at?new Date(index.generated_at).toLocaleDateString():'Not indexed';$('excerptCount').textContent=String(index.snippets?.length||0);$('syncIndicator').textContent=status.status==='indexed'?'Sources indexed':status.status==='partial'?'Partial source index':'Index pending';$('sourceWarnings').textContent=status.warnings?.length?status.warnings.join(' · '):'Index excerpts are research navigation only; current GIS and amendments still require verification.';updateParking();renderLibrary();}catch(e){$('syncIndicator').textContent='Offline index';$('sourceIndexStatus').textContent='Unable to load';$('sourceWarnings').textContent='Data files could not be loaded. If opened as file://, use GitHub Pages instead of double-clicking index.html.';}}
function updateParking(){const select=$('parkingUse'), old=select.value;select.innerHTML='<option value="">Select a use / not specified</option>'+(state.municipality==='brantford'?(state.standards?.brantford_parking?.rates||[]).map(r=>`<option value="${esc(r.id)}">${esc(r.label)}</option>`).join(''):'');if([...select.options].some(o=>o.value===old))select.value=old;else select.value=useGuess($('use').value);parkingFields();}
let activeFilter='all';function renderLibrary(){const all=state.index?.snippets||[], query=$('docSearch').value.trim().toLowerCase();const filtered=all.filter(x=>(activeFilter==='all'||x.jurisdiction===activeFilter)&&(!query||`${x.title} ${x.excerpt}`.toLowerCase().includes(query))).slice(0,80);
 $('docResults').innerHTML=filtered.length?filtered.map(item=>`<article class="doc-card"><div class="meta">${esc(item.jurisdiction?.toUpperCase()||'OFFICIAL')} · ${item.content_type==='html'?'TEXT BLOCK':'PDF PAGE'} ${esc(item.page)}</div><h3>${esc(item.title)}</h3><p>${esc(item.excerpt)}</p>${sourceLink(item.source_url,'Open original official document ↗')}</article>`).join(''):`<div class="empty-state"><h3>${all.length?'No matching official excerpts':'No official document index yet'}</h3><p>${all.length?'Try a broader phrase; indexing is selective, not a complete by-law search.':'The first GitHub Actions run needs to download and index official documents. It may take several minutes.'}</p></div>`;}
function nav(view){for(const el of document.querySelectorAll('[data-view]'))el.classList.toggle('active',el.dataset.view===view);for(const v of ['study','research','method'])$(v+'View').classList.toggle('hidden',v!==view);$('breadcrumb').textContent=({study:'NEW STUDY',research:'OFFICIAL SOURCE LIBRARY',method:'METHOD & LIMITATIONS'})[view];}
function start(){document.querySelectorAll('[data-view]').forEach(e=>e.addEventListener('click',()=>nav(e.dataset.view)));$('studyForm').addEventListener('submit',lookup);$('manualBtn').addEventListener('click',setManual);$('exportBtn').addEventListener('click',()=>window.print());$('municipality').addEventListener('change',()=>{state.municipality=$('municipality').value;reset();updateParking();});$('buildingType').addEventListener('change',renderStandards);$('parkingUse').addEventListener('change',()=>{parkingFields();renderStandards();});$('use').addEventListener('change',autoParking);$('use').addEventListener('blur',autoParking);$('serviceBays').addEventListener('input',renderStandards);$('gfa').addEventListener('input',renderStandards);$('docSearch').addEventListener('input',renderLibrary);document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{activeFilter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(n=>n.classList.toggle('active',n===b));renderLibrary();}));drawChecks();loadIndex();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
