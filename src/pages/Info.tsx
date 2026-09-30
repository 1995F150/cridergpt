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
<header><nav className="wrap" aria-label="Main navigation"><a className="brand" href="#info-top"><span className="mark" aria-hidden="true">C</span>CriderGPT</a><div className="navlinks"><a href="#explore">Explore</a><a href="#about">Our story</a><a className="small" href="/">Open CriderGPT</a></div></nav></header><main className="wrap"><div className="hero"><div><div className="eyebrow">Independent ideas. Built with AI.</div><h1>Make room for<br />your <span>next idea.</span></h1><p className="intro">A question, a rough draft, a project you can’t stop thinking about. Bring it to CriderGPT and find your next step.</p><div className="actions"><a className="button" href="/">Open CriderGPT</a><a className="button secondary" href="#explore">Explore the possibilities</a></div><p className="footnote">Created by Jessie Crider · Founded in Virginia, 2025</p></div><div className="console" aria-label="Illustrative CriderGPT conversation"><div className="console-top"><span>CRIDERGPT / IDEAS INTO ACTION</span><span>01</span></div><div className="console-body"><div className="prompt">I have an idea for an app. Where do I start?</div><div className="assistant-label">CriderGPT</div><div className="response"><p>Start with one useful thing your app can do.</p><ol><li>Choose the person you’re building for.</li><li>Describe the problem in one sentence.</li><li>Sketch the smallest version that solves it.</li></ol><p style={{ marginTop: 18 }}>What would that first version look like?</p></div></div><div className="console-bottom">Illustrative conversation · Your idea sets the direction</div></div></div><div className="strip"><span>A starting point for what’s next</span><span>THINK IT THROUGH</span><span>WRITE IT DOWN</span><span>BUILD IT OUT</span></div><section id="explore"><div className="section-top"><div><div className="eyebrow">A little curiosity goes a long way</div><h2>From “what if”<br />to a first step.</h2></div><p>Explore a few ways to approach your next project. Choose an example to see how a clearer question can move it forward.</p></div><Tabs defaultValue="build" className="info-examples">
<TabsList className="tabs" aria-label="Explore examples">
<TabsTrigger value="build">Build something</TabsTrigger>
<TabsTrigger value="write">Find the words</TabsTrigger>
<TabsTrigger value="learn">Understand it</TabsTrigger>
</TabsList>
{examples.map(example => <TabsContent key={example.id} value={example.id}>
<div className="example"><div className="example-info"><span className="label">The starting point</span><h3>{example.title}</h3><p>{example.prompt}</p></div><div className="example-answer"><div className="assistant-label">An example approach</div>{example.answer}</div></div>
</TabsContent>)}
</Tabs></section><section className="about" id="about"><div><div className="eyebrow">Built by a maker</div><h2>An independent project.<br />A bigger ambition.</h2></div><div className="about-detail"><p>CriderGPT began in Virginia in July 2025, founded by Jessie Crider. It’s a project shaped by a hands-on interest in AI, software, and the infrastructure behind them.</p><p>The vision is straightforward: help people turn curiosity into something they can work with, whether that’s an explanation, a plan, or the beginning of a build.</p><p className="signature">Jessie Crider / Founder, CriderGPT</p></div></section><div className="cta"><div><h2>Your next project starts with a question.</h2><p>Bring an idea. Give it somewhere to go.</p></div><a className="button" href="/">Open CriderGPT</a></div></main><footer><div className="wrap footer-inner"><span>© 2026 CriderGPT</span><span>Independent AI. Made in Virginia.</span><a href="#info-top">Back to top</a></div></footer>
  </div>;
}
