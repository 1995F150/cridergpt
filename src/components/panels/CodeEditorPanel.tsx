import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Bot, Copy, Download, Save, FileCode, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LANGUAGES = ['typescript', 'javascript', 'python', 'html', 'css', 'json', 'sql'];

const TEMPLATE_FILES: Record<string, string> = {
  'TypeScript Component': `import React from 'react';\n\nexport function MyComponent() {\n  return <div>Hello World</div>;\n}`,
  'Edge Function': `import { serve } from "https://deno.land/std@0.168.0/http/server.ts";\n\nserve(async (req) => {\n  return new Response(JSON.stringify({ ok: true }), {\n    headers: { "Content-Type": "application/json" },\n  });\n});`,
  'Python Script': `#!/usr/bin/env python3\n"""My Script"""\n\ndef main():\n    print("Hello from CriderGPT")\n\nif __name__ == "__main__":\n    main()`,
};

export function CodeEditorPanel() {
  const { user } = useAuth();
  const [code, setCode] = useState('// Start coding here...\n');
  const [language, setLanguage] = useState('typescript');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Owner-only check
  const isOwner = user?.email === 'jessiecrider3@gmail.com';
  if (!isOwner) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileCode className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Code Editor is restricted to the developer.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function handleRun() {
    setRunning(true);
    setOutput('Running...\n');
    try {
      const { data, error } = await supabase.functions.invoke('generate-code', {
        body: { code, language, action: 'run' },
      });
      if (error) throw error;
      setOutput(data?.output || data?.result || JSON.stringify(data, null, 2));
    } catch (e: any) {
      setOutput(`Error: ${e.message}`);
    }
    setRunning(false);
  }

  async function handleAIAssist() {
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('chat-with-ai', {
        body: {
          message: `Help me with this ${language} code. Explain what it does, find bugs, and suggest improvements:\n\n\`\`\`${language}\n${code}\n\`\`\``,
        },
      });
      if (error) throw error;
      setOutput(data?.response || 'No response');
    } catch (e: any) {
      setOutput(`AI Error: ${e.message}`);
    }
    setAiLoading(false);
  }

  function loadTemplate(name: string) {
    setCode(TEMPLATE_FILES[name] || '');
    toast.success(`Loaded template: ${name}`);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  }

  function downloadCode() {
    const ext = language === 'typescript' ? 'ts' : language === 'javascript' ? 'js' : language === 'python' ? 'py' : language;
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full flex flex-col p-4 gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={language} onValueChange={setLanguage}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={loadTemplate}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Load template..." />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(TEMPLATE_FILES).map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button size="sm" variant="outline" onClick={copyCode}>
          <Copy className="h-4 w-4 mr-1" /> Copy
        </Button>
        <Button size="sm" variant="outline" onClick={downloadCode}>
          <Download className="h-4 w-4 mr-1" /> Download
        </Button>
        <Button size="sm" variant="secondary" onClick={handleAIAssist} disabled={aiLoading}>
          {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Bot className="h-4 w-4 mr-1" />}
          AI Assist
        </Button>
        <Button size="sm" onClick={handleRun} disabled={running}>
          {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
          Run
        </Button>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 flex gap-4">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{language}</Badge>
            <span className="text-xs text-muted-foreground">Editor</span>
          </div>
          <Textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 font-mono text-sm resize-none bg-muted/30"
            spellCheck={false}
          />
        </div>

        {/* Output */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="secondary" className="text-xs">Output</Badge>
          </div>
          <pre className="flex-1 bg-muted/50 rounded-md p-3 text-xs font-mono overflow-auto whitespace-pre-wrap">
            {output || 'Output will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}
