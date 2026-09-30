import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import "./Info.css";

const examples = [
  { id: "build", title: "Give an idea a working shape.", prompt: "“Help me plan a simple website for my computer repair business.”", answer: <><p>Start with the essentials: what you repair, where you work, and how someone can reach you.</p><ol><li>A clear introduction</li><li>Services and common repairs</li><li>How to request a quote</li></ol><p>Build that first. Expand when you know what customers need.</p></> },
  { id: "write", title: "Make the message clearer.", prompt: "“Help me explain a project delay to a customer.”", answer: <><p>“Hi Alex, I need one more day to finish checking the repair. I’ll send an update tomorrow by 3 p.m. Thanks for your patience.”</p><p>A useful update names what changed, sets a clear expectation, and keeps the reader informed.</p></> },
  { id: "learn", title: "Break down the unfamiliar.", prompt: "“Explain what a server does in plain English.”", answer: <><p>A server is a computer that provides something to other computers.</p><p>A website server sends pages to your browser. A file server stores documents for a team. A game server keeps players in the same shared world.</p><p>The basic idea: one computer makes a service available to others.</p></> },
];

export default function Info() {
  return <div className="crider-info" id="info-top">
    <Helmet>
      <title>CriderGPT — Make room for your next idea</title>
      <meta name="description" content="Explore CriderGPT, an independent AI platform founded by Jessie Crider. Turn questions into ideas, code, and practical next steps." />
      <link rel="canonical" href="https://cridergpt.com/info" />
    </Helmet>
<header><nav className="wrap" aria-label="Main navigation"><a className="brand" href="#info-top"><span className="mark" aria-hidden="true">C</span>CriderGPT</a><div className="navlinks"><a href="#explore">Explore</a><a href="#infrastructure">Infrastructure</a><a href="#about">Our story</a><a className="small" href="/">Open CriderGPT</a></div></nav></header><main className="wrap"><div className="hero"><div><div className="eyebrow">Independent ideas. Built with AI.</div><h1>Make room for<br />your <span>next idea.</span></h1><p className="intro">A question, a rough draft, a project you can’t stop thinking about. Bring it to CriderGPT and find your next step.</p><div className="actions"><a className="button" href="/">Open CriderGPT</a><a className="button secondary" href="#explore">Explore the possibilities</a></div><p className="footnote">Created by Jessie Crider · Founded in Virginia, 2025</p></div><div className="console" aria-label="Illustrative CriderGPT conversation"><div className="console-top"><span>CRIDERGPT / IDEAS INTO ACTION</span><span>01</span></div><div className="console-body"><div className="prompt">I have an idea for an app. Where do I start?</div><div className="assistant-label">CriderGPT</div><div className="response"><p>Start with one useful thing your app can do.</p><ol><li>Choose the person you’re building for.</li><li>Describe the problem in one sentence.</li><li>Sketch the smallest version that solves it.</li></ol><p style={{ marginTop: 18 }}>What would that first version look like?</p></div></div><div className="console-bottom">Illustrative conversation · Your idea sets the direction</div></div></div><div className="strip"><span>A starting point for what’s next</span><span>THINK IT THROUGH</span><span>WRITE IT DOWN</span><span>BUILD IT OUT</span></div><section id="explore"><div className="section-top"><div><div className="eyebrow">A little curiosity goes a long way</div><h2>From “what if”<br />to a first step.</h2></div><p>Explore a few ways to approach your next project. Choose an example to see how a clearer question can move it forward.</p></div><Tabs defaultValue="build" className="info-examples">
<TabsList className="tabs" aria-label="Explore examples">
<TabsTrigger value="build">Build something</TabsTrigger>
<TabsTrigger value="write">Find the words</TabsTrigger>
<TabsTrigger value="learn">Understand it</TabsTrigger>
</TabsList>
{examples.map(example => <TabsContent key={example.id} value={example.id}>
<div className="example"><div className="example-info"><span className="label">The starting point</span><h3>{example.title}</h3><p>{example.prompt}</p></div><div className="example-answer"><div className="assistant-label">An example approach</div>{example.answer}</div></div>
</TabsContent>)}
</Tabs></section>
<section id="infrastructure" className="infrastructure">
  <div className="section-top">
    <div><div className="eyebrow">Behind CriderGPT</div><h2>One cabinet.<br />Two distinct jobs.</h2></div>
    <p>A 22U rack is the next home for the existing CriderGPT Engine server and a separate customer hosting build. Assembly, migration, and testing are still ahead.</p>
  </div>
  <div className="rack-summary" aria-label="Infrastructure plan highlights">
    <div><strong>22U</strong><span>Cabinet capacity</span></div>
    <div><strong>AM4</strong><span>Customer server platform</span></div>
    <div><strong>32GB</strong><span>DDR4 in the new build</span></div>
    <div><strong>Ethernet</strong><span>Planned rack connections</span></div>
  </div>
  <div className="server-grid">
    <article className="server-card">
      <span className="plan-badge">Existing server · Rack migration planned</span>
      <h3>CriderGPT Engine</h3>
      <p>The current Linux server is intended to continue running CriderGPT Engine and local AI workloads. It will move into a rackmount chassis inside the cabinet.</p>
      <ul><li>Local engine and model testing</li><li>Tokenizer and model development</li><li>Future training and fine-tuning work</li></ul>
      <p className="server-note">This is the AI server. The new customer build has a separate role.</p>
      <a className="repo-link" href="https://github.com/1995F150/cridergpt-engine">Explore the engine on GitHub</a>
    </article>
    <article className="server-card">
      <span className="plan-badge">New build · Customer hosting planned</span>
      <h3>Virtual machines for customers</h3>
      <p>The incoming parts are for a separate server intended to host customer virtual machines, with individually assigned compute, memory, and storage.</p>
      <dl className="server-specs"><div><dt>Processor</dt><dd>AMD Ryzen 7 5700G</dd></div><div><dt>CPU capacity</dt><dd>8 cores / 16 threads</dd></div><div><dt>Memory</dt><dd>32GB DDR4 · 2 × 16GB</dd></div><div><dt>Platform</dt><dd>AM4</dd></div><div><dt>Dedicated GPU</dt><dd>Future addition</dd></div><div><dt>Storage capacity</dt><dd>To be confirmed</dd></div></dl>
      <p className="server-note">Customer availability and final configurations will be announced after setup and testing.</p>
    </article>
  </div>
  <details className="rack-details">
    <summary>Cabinet, chassis, and networking plans</summary>
    <div className="rack-detail-grid">
      <div><h3>22U rack cabinet</h3><p>The VEVOR cabinet will bring servers and networking equipment into one enclosure, with room to organize cables and expand the setup.</p></div>
      <div><h3>4U server chassis</h3><p>The ordered UTLGAMENG rackmount case supports the new server build. A chassis migration is also planned for the existing AI server.</p></div>
      <div><h3>Wired networking</h3><p>Cat6 cables and a Cable Matters 1U, 24-port patch panel will organize connections. Servers will connect through a network switch to the router; switch capacity is still to be confirmed.</p></div>
      <div><h3>Cooling and expansion</h3><p>A Thermalright Assassin X120 cooler is part of the new build. A dedicated GPU is planned for later; its role and availability will be confirmed after installation and testing.</p></div>
    </div>
  </details>
</section>
<section id="hosting-plans" className="hosting-plans">
  <div className="section-top"><div><div className="eyebrow">Planned customer hosting</div><h2>Resources shaped<br />around the workload.</h2></div><p>The rental concept is based on the resources each customer receives. Rates and billing rules are still being worked out.</p></div>
  <div className="resource-table-wrap"><table className="resource-table"><caption>Planned resource allocation and usage tracking</caption><thead><tr><th scope="col">Resource</th><th scope="col">Planned approach</th><th scope="col">What needs to be confirmed</th></tr></thead><tbody>
    <tr><th scope="row">CPU</th><td>Assign virtual CPUs or a defined share of processing capacity; track CPU utilization.</td><td>Allocation limits and whether billing uses reserved capacity, measured usage, or both.</td></tr>
    <tr><th scope="row">RAM</th><td>Assign a memory allowance to each virtual machine and track its usage.</td><td>Available plans and host memory reserved for the system.</td></tr>
    <tr><th scope="row">Storage</th><td>Allocate disk space for each customer’s virtual machine.</td><td>Capacity, storage type, backups, and any extra storage charges.</td></tr>
    <tr><th scope="row">GPU</th><td>Consider GPU access after a dedicated card is installed and tested.</td><td>Sharing or passthrough support, availability, and pricing.</td></tr>
    <tr><th scope="row">Power</th><td>Consider electricity costs when setting hosting rates.</td><td>Whether power stays included or is separately metered and disclosed.</td></tr>
  </tbody></table></div>
  <div className="hosting-status"><span className="plan-badge">In development</span><p>There are no published rental rates yet. This page describes the plan, not an active ordering service or a live usage dashboard.</p></div>
</section>
<section className="about" id="about"><div><div className="eyebrow">Built by a maker</div><h2>An independent project.<br />A bigger ambition.</h2></div><div className="about-detail"><p>CriderGPT began in Virginia in July 2025, founded by Jessie Crider. It’s a project shaped by a hands-on interest in AI, software, and the infrastructure behind them.</p><p>The vision is straightforward: help people turn curiosity into something they can work with, whether that’s an explanation, a plan, or the beginning of a build.</p><p className="signature">Jessie Crider / Founder, CriderGPT</p></div></section><div className="cta"><div><h2>Your next project starts with a question.</h2><p>Bring an idea. Give it somewhere to go.</p></div><a className="button" href="/">Open CriderGPT</a></div></main><footer><div className="wrap footer-inner"><span>© 2026 CriderGPT</span><span>Independent AI. Made in Virginia.</span><a href="#info-top">Back to top</a></div></footer>
  </div>;
}
