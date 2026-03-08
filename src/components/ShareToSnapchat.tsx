import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Ghost } from 'lucide-react';

interface ShareToSnapchatProps {
  title: string;
  content: string;
  /** Optional URL to attach */
  url?: string;
  variant?: 'default' | 'icon';
  className?: string;
}

export function ShareToSnapchat({ title, content, url, variant = 'default', className }: ShareToSnapchatProps) {
  const { toast } = useToast();

  const handleShare = async () => {
    // Snap Creative Kit Web SDK - uses Snapchat's share URL scheme
    const shareText = `${title}\n\n${content.slice(0, 200)}${content.length > 200 ? '...' : ''}`;
    const attachUrl = url || window.location.href;

    // Try Web Share API first (works on mobile with Snapchat installed)
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: attachUrl,
        });
        toast({ title: 'Shared! 👻', description: 'Content shared successfully.' });
        return;
      } catch (e) {
        // User cancelled or API not supported for Snapchat specifically
      }
    }

    // Fallback: Open Snapchat's web share URL
    const snapShareUrl = `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(attachUrl)}`;
    
    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      snapShareUrl,
      'snapchat-share',
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    toast({
      title: 'Opening Snapchat 👻',
      description: 'Share your CriderGPT content with friends!',
    });
  };

  if (variant === 'icon') {
    return (
      <Button
        onClick={handleShare}
        variant="ghost"
        size="icon"
        className={className}
        title="Share to Snapchat"
      >
        <Ghost className="h-4 w-4 text-[#FFFC00]" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={`gap-2 border-[#FFFC00]/30 hover:bg-[#FFFC00]/10 ${className || ''}`}
    >
      <Ghost className="h-4 w-4 text-[#FFFC00]" />
      Share to Snapchat
    </Button>
  );
}
