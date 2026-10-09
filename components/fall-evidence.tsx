const evidence = [
  { value: "37.3", unit: "M", title: "falls need medical care each year.", context: "WHO global estimate, all ages.", source: "WHO · 2021", href: "https://www.who.int/news-room/fact-sheets/detail/falls", className: "evidence-lead" },
  { value: "41", unit: "%", title: "involved incorrect weight shifting.", context: "93 of 227 filmed falls in two Canadian care homes.", source: "Robinovitch et al. · 2013", href: "https://pubmed.ncbi.nlm.nih.gov/23083889/" },
  { value: "40–60", unit: "%", title: "regain their earlier mobility.", context: "Hip-fracture survivors within one year. A review of long-term outcomes.", source: "Dyer et al. · 2016", href: "https://link.springer.com/article/10.1186/s12877-016-0332-0" },
  { value: "43.8", unit: "%", title: "followed a no-recovery path.", context: "Disability over one year after serious fall injury; 130 older adults.", source: "Gill et al. · 2013", href: "https://pubmed.ncbi.nlm.nih.gov/23958741/" },
  { value: "13.4", unit: "%", title: "reported a fall in Singapore.", context: "2,435 community-dwelling adults aged 65+. Historical data from 2010.", source: "Chen et al. · CARE brief", href: "https://www.duke-nus.edu.sg/docs/librariesprovider3/research-policy-brief-docs/predictors-of-falls-among-older-singaporeans.pdf?sfvrsn=e8b838ae_0" },
  { value: "34", unit: "falls", title: "among 16 walker users.", context: "Filmed in two care facilities. A selected sample, not a population rate.", source: "Nickerson et al. · 2024", href: "https://pmc.ncbi.nlm.nih.gov/articles/PMC10995100/" },
];

export function FallEvidence() {
  return <section className="evidence" id="research" aria-labelledby="evidence-title">
    <div className="content-width">
      <div className="evidence-heading reveal"><p className="eyebrow">WHY EVERY STEP MATTERS</p><h2 id="evidence-title">A fall can change<br /><span>more than a day.</span></h2></div>
      <div className="evidence-grid">{evidence.map((item,index)=><article key={item.value} className={`stat-card reveal ${item.className || ""}`}>
        <span className="stat-index">0{index+1} / THE RESEARCH</span>
        <p className="stat-value">{item.value}<span>{item.unit}</span></p>
        <h3>{item.title}</h3><p>{item.context}</p>
        <a href={item.href} target="_blank" rel="noreferrer">{item.source}</a>
      </article>)}</div>
      <p className="evidence-footnote">Different studies, different groups. These findings guide our design; they do not measure AIRI’s performance.</p>
    </div>
  </section>;
}
