// AI Advokat Governed Connector Library v1
// Registry only: a connector entry is not a claim that a third-party integration is authenticated or active.
export const CONNECTOR_LIBRARY_VERSION="1.0.0";
export const GOVERNED_CONNECTORS=Object.freeze([
  Object.freeze({id:"legal_base",label:"Legal Base & Current-Law",kind:"internal",href:"/hybrid-legal-intelligence.html",state:"available",mode:"read_research",externalActions:false}),
  Object.freeze({id:"professional_tools",label:"Professional Tools / Review Tables",kind:"internal",href:"/professional-tools.html",state:"available",mode:"browser_local_plus_governed_verification",externalActions:false}),
  Object.freeze({id:"casepilot_space",label:"CasePilot Matter Space",kind:"internal",href:"/casepilot-workspace.html",state:"available",mode:"case_scoped_workspace",externalActions:false}),
  Object.freeze({id:"case_law_radar",label:"Case-Law Corpus Radar",kind:"internal",href:"/case-law-curation.html",state:"available",mode:"reviewed_vs_discovery",externalActions:false}),
  Object.freeze({id:"echr_crosswalk",label:"ECHR Crosswalk",kind:"internal",href:"/echr-crosswalk.html",state:"available",mode:"research_crosswalk",externalActions:false}),
  Object.freeze({id:"journal_library",label:"Professional Library",kind:"internal",href:"/professional-library/",state:"available",mode:"knowledge_library",externalActions:false}),
  Object.freeze({id:"official_source_watch",label:"Official Source Watch",kind:"governed_source",href:"/consolidator/",state:"available",mode:"candidate_change_observation",externalActions:false}),
  Object.freeze({id:"open_data_services",label:"Open Data & e-Services",kind:"governed_source",href:"/public-legal-data-services.html",state:"available",mode:"read_and_navigate",externalActions:false})
]);
export function connectorById(id){return GOVERNED_CONNECTORS.find(x=>x.id===id)||null}
export function connectorSummary(){
  return Object.freeze({
    version:CONNECTOR_LIBRARY_VERSION,
    total:GOVERNED_CONNECTORS.length,
    available:GOVERNED_CONNECTORS.filter(x=>x.state==="available").length,
    authenticatedThirdPartyIntegrations:0,
    autonomousExternalActions:false,
    humanGateRequired:true
  });
}
