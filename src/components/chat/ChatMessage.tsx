import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Code, Download, ExternalLink, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseTextWithLinks, TextPart } from "@/utils/linkParser";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUrl?: string;
  userName?: string;
  userAvatar?: string;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  imageUrl,
  userName = "You",
  userAvatar,
}: ChatMessageProps) {
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const isUser = role === "user";

  // Parse code blocks from content
  const parseContent = (text: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: Array<{ type: "text" | "code"; content: string; language?: string }> = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({
        type: "code",
        language: match[1] || "plaintext",
        content: match[2].trim(),
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.length > 0 ? parts : [{ type: "text" as const, content: text }];
  };

  const handleCopyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedCode(index);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCopyLink = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Render text with clickable links
  const renderTextWithLinks = (text: string) => {
    const parts = parseTextWithLinks(text);
    
    return parts.map((part: TextPart, index: number) => {
      if (part.type === 'link' && part.url) {
        return (
          <span key={index} className="inline-flex items-center gap-1">
            <a
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "inline-flex items-center gap-1 text-primary hover:underline font-medium",
                isUser && "text-primary-foreground/90 hover:text-primary-foreground"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <LinkIcon className="h-3 w-3 inline shrink-0" />
              <span className="break-all">{part.content}</span>
              <ExternalLink className="h-3 w-3 inline shrink-0 opacity-70" />
            </a>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 inline-flex opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleCopyLink(part.url!);
              }}
            >
              {copiedLink === part.url ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </span>
        );
      }
      return <span key={index}>{part.content}</span>;
    });
  };

  const parts = parseContent(content);

  return (
    <div
      className={cn(
        "flex gap-3 py-4 px-4",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0">
        {isUser ? (
          <>
            <AvatarImage src={userAvatar} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </>
        ) : (
          <>
            <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">
              C
            </AvatarFallback>
          </>
        )}
      </Avatar>

      {/* Message Content */}
      <div
        className={cn(
          "flex flex-col max-w-[80%] space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {/* Header */}
        <div className={cn("flex items-center gap-2", isUser && "flex-row-reverse")}>
          <span className="text-sm font-medium">
            {isUser ? userName : "CriderGPT"}
          </span>
          <span className="text-xs text-muted-foreground">
            {new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {/* Image if present */}
        {imageUrl && (
          <div className="relative group">
            <img
              src={imageUrl}
              alt="Generated or uploaded image"
              className="max-w-sm rounded-lg border border-border shadow-md"
              onError={(e) => {
                console.error('Image failed to load:', imageUrl.substring(0, 100));
              }}
            />
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={() => {
                  // Download image
                  const link = document.createElement('a');
                  link.download = `cridergpt_${Date.now()}.png`;
                  link.href = imageUrl;
                  link.click();
                }}
              >
                <Download className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7"
                onClick={() => window.open(imageUrl, "_blank")}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Text Content */}
        <div
          className={cn(
            "rounded-2xl px-4 py-3",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted rounded-tl-sm"
          )}
        >
          {parts.map((part, index) =>
            part.type === "code" ? (
              <div key={index} className="my-2">
                <div className="flex items-center justify-between bg-background/50 rounded-t-lg px-3 py-2 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Code className="h-3 w-3" />
                    <Badge variant="outline" className="text-xs">
                      {part.language}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => handleCopyCode(part.content, index)}
                  >
                    {copiedCode === index ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="bg-background/50 rounded-b-lg p-3 overflow-x-auto text-sm">
                  <code>{part.content}</code>
                </pre>
              </div>
            ) : (
              <p key={index} className="text-sm whitespace-pre-wrap leading-relaxed">
                {renderTextWithLinks(part.content)}
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );
}
