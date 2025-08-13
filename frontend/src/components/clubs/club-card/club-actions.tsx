import React from 'react';
import { 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye, 
  Settings, 
  CheckCircle,
  ExternalLink 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ClubActionsProps {
  clubId: string;
  isActive?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetActive?: () => void;
  onManage?: () => void;
  variant?: 'dropdown' | 'inline';
  className?: string;
}

export const ClubActions: React.FC<ClubActionsProps> = ({
  clubId,
  isActive = false,
  onView,
  onEdit,
  onDelete,
  onSetActive,
  onManage,
  variant = 'dropdown',
  className,
}) => {
  const { t } = useTranslation();

  if (variant === 'inline') {
    return (
      <div className={className}>
        {onView && (
          <Button variant="outline" size="sm" onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            {t('clubs.viewDetails')}
          </Button>
        )}
        {onManage && (
          <Button variant="default" size="sm" onClick={onManage}>
            <Settings className="h-4 w-4 mr-2" />
            {t('clubs.manageSettings')}
          </Button>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <Eye className="h-4 w-4 mr-2" />
            {t('clubs.viewDetails')}
          </DropdownMenuItem>
        )}
        
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            {t('common.edit')}
          </DropdownMenuItem>
        )}
        
        {onManage && (
          <DropdownMenuItem onClick={onManage}>
            <Settings className="h-4 w-4 mr-2" />
            {t('clubs.manageSettings')}
          </DropdownMenuItem>
        )}
        
        {!isActive && onSetActive && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSetActive}>
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('clubs.setActive')}
            </DropdownMenuItem>
          </>
        )}
        
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};