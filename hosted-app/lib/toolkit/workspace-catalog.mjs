export const audiences = [
  {id:'freelancer',label:'Freelancers',description:'Win work, control scope and deliver with evidence.'},
  {id:'student',label:'Students',description:'Plan learning, complete projects and show your skills.'},
  {id:'professional',label:'Professionals',description:'Plan delivery, build career evidence and manage commitments.'},
];

// Existing IDs remain stable for saved reports and favorites.
export const toolTaxonomy = {
  audit:{audiences:['freelancer','professional'],subcategory:'Profile & evidence'},
  match:{audiences:['freelancer','student','professional'],subcategory:'Opportunities'},
  proposal:{audiences:['freelancer','professional'],subcategory:'Client acquisition'},
  pricing:{audiences:['freelancer','professional'],subcategory:'Business planning'},
  project:{audiences:['freelancer','student','professional'],subcategory:'Delivery planning'},
  gpa:{audiences:['student'],subcategory:'Academic progress'},
  percentage:{audiences:['student'],subcategory:'Academic progress'},
};

/** Synthetic examples are loaded only by an explicit user action. */
export function examplePlan(audience) {
  const presets = {
    freelancer:{title:'Example: client website delivery',requirements:[
      {id:'scope',label:'Client acceptance criteria',evidence:''},
      {id:'delivery',label:'Delivery and testing evidence',evidence:''},
    ],tasks:[
      {id:'discovery',title:'Confirm scope and acceptance',hours:3,dueDay:2,dependsOn:[],requirementIds:['scope']},
      {id:'build',title:'Implement agreed deliverables',hours:10,dueDay:5,dependsOn:['discovery'],requirementIds:['scope']},
      {id:'review',title:'Test and assemble handover evidence',hours:5,dueDay:6,dependsOn:['build'],requirementIds:['delivery']},
    ]},
    student:{title:'Example: research project to portfolio',requirements:[
      {id:'sources',label:'Traceable research sources',evidence:''},
      {id:'skill',label:'Demonstrated analysis skill',evidence:''},
    ],tasks:[
      {id:'read',title:'Read and record source references',hours:4,dueDay:2,dependsOn:[],requirementIds:['sources']},
      {id:'experiment',title:'Complete a reproducible experiment',hours:9,dueDay:5,dependsOn:['read'],requirementIds:['skill']},
      {id:'portfolio',title:'Explain results and limitations',hours:5,dueDay:6,dependsOn:['experiment'],requirementIds:['sources','skill']},
    ]},
    professional:{title:'Example: service migration readiness',requirements:[
      {id:'rollback',label:'Reviewed rollback procedure',evidence:''},
      {id:'validation',label:'Validation and handover evidence',evidence:''},
    ],tasks:[
      {id:'design',title:'Review dependencies and rollback plan',hours:4,dueDay:2,dependsOn:[],requirementIds:['rollback']},
      {id:'prepare',title:'Prepare migration in an isolated environment',hours:8,dueDay:4,dependsOn:['design'],requirementIds:['rollback']},
      {id:'validate',title:'Validate results and prepare handover',hours:6,dueDay:6,dependsOn:['prepare'],requirementIds:['validation']},
    ]},
  };
  if (!Object.hasOwn(presets,audience)) throw new Error('Choose an audience.');
  return structuredClone({audience,days:6,hoursPerDay:3,...presets[audience]});
}
