import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES } from '@/i18n';

interface LanguageSelectorProps {
  variant?: 'icon' | 'full';
}

export function LanguageSelector({ variant = 'icon' }: LanguageSelectorProps) {
  const { i18n, t } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language)
    ?? SUPPORTED_LANGUAGES.find(l => i18n.language?.startsWith(l.code))
    ?? SUPPORTED_LANGUAGES[0];

  const change = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('cridergpt_lang', code);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === 'icon' ? 'sm' : 'default'}
          className={variant === 'icon' ? 'h-9 w-9 p-0' : 'gap-2'}
          aria-label={t('common.language')}
        >
          {variant === 'icon' ? (
            <Globe className="h-4 w-4" />
          ) : (
            <>
              <span className="text-base leading-none">{current.flag}</span>
              <span>{current.label}</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-popover z-[60]">
        <DropdownMenuLabel>{t('common.language')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {SUPPORTED_LANGUAGES.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => change(lang.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
            {current.code === lang.code && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
