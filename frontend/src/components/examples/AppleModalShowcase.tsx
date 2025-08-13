'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Calendar, 
  Trophy, 
  Bell, 
  Shield, 
  Smartphone,
  Monitor,
  Palette,
  Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AppleModal } from '@/components/ui/apple-modal';
import {
  AppleModalHeader,
  AppleModalFormLayout,
  AppleModalFormSection,
  AppleModalFooter,
  AppleModalListLayout,
  AppleModalListItem,
  AppleModalInfoLayout,
  AppleModalInfoItem,
  AppleModalProgressIndicator,
} from '@/components/ui/modal-layouts';

export const AppleModalShowcase: React.FC = () => {
  const [modals, setModals] = useState({
    sheet: false,
    card: false,
    popover: false,
    fullscreen: false,
    form: false,
    list: false,
    info: false,
    multiStep: false,
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [selectedOption, setSelectedOption] = useState<string>('');

  const openModal = (type: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [type]: true }));
  };

  const closeModal = (type: keyof typeof modals) => {
    setModals(prev => ({ ...prev, [type]: false }));
    if (type === 'multiStep') {
      setCurrentStep(1);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-display-md font-bold text-gray-900 dark:text-white mb-4">
            Apple HIG Modal Showcase
          </h1>
          <p className="text-body-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Explore different modal presentations and layouts following Apple Human Interface Guidelines.
            Each modal demonstrates proper accessibility, gestures, and visual design.
          </p>
        </div>

        {/* Modal Triggers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <Button
            onClick={() => openModal('sheet')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Smartphone className="w-6 h-6" />
            <span>Sheet Modal</span>
            <span className="text-caption-sm opacity-60">Mobile friendly</span>
          </Button>

          <Button
            onClick={() => openModal('card')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Monitor className="w-6 h-6" />
            <span>Card Modal</span>
            <span className="text-caption-sm opacity-60">Desktop centered</span>
          </Button>

          <Button
            onClick={() => openModal('popover')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Bell className="w-6 h-6" />
            <span>Popover Modal</span>
            <span className="text-caption-sm opacity-60">Contextual</span>
          </Button>

          <Button
            onClick={() => openModal('fullscreen')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Settings className="w-6 h-6" />
            <span>Fullscreen</span>
            <span className="text-caption-sm opacity-60">Complex tasks</span>
          </Button>

          <Button
            onClick={() => openModal('form')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <User className="w-6 h-6" />
            <span>Form Layout</span>
            <span className="text-caption-sm opacity-60">Data entry</span>
          </Button>

          <Button
            onClick={() => openModal('list')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Palette className="w-6 h-6" />
            <span>List Layout</span>
            <span className="text-caption-sm opacity-60">Selection</span>
          </Button>

          <Button
            onClick={() => openModal('info')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Shield className="w-6 h-6" />
            <span>Info Layout</span>
            <span className="text-caption-sm opacity-60">Details</span>
          </Button>

          <Button
            onClick={() => openModal('multiStep')}
            className="h-24 flex flex-col items-center gap-2"
            variant="outline"
          >
            <Trophy className="w-6 h-6" />
            <span>Multi-step</span>
            <span className="text-caption-sm opacity-60">Wizard flow</span>
          </Button>
        </div>

        {/* Sheet Modal */}
        <AppleModal
          isOpen={modals.sheet}
          onClose={() => closeModal('sheet')}
          presentationStyle="sheet"
          size="lg"
        >
          <AppleModalHeader
            title="Sheet Presentation"
            description="Perfect for mobile interfaces with gesture support"
            onClose={() => closeModal('sheet')}
          />
          
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl">
              <h3 className="text-ui-lg font-medium text-blue-900 dark:text-blue-100 mb-2">
                📱 Mobile Features
              </h3>
              <ul className="text-body-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Swipe down to dismiss</li>
                <li>• Haptic feedback on interactions</li>
                <li>• Optimized touch targets</li>
                <li>• Smooth spring animations</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <Label>Quick Settings</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-body-md">Notifications</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-md">Dark Mode</span>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-body-md">Location Services</span>
                  <Switch />
                </div>
              </div>
            </div>
          </div>
        </AppleModal>

        {/* Card Modal */}
        <AppleModal
          isOpen={modals.card}
          onClose={() => closeModal('card')}
          presentationStyle="card"
          size="md"
        >
          <AppleModalHeader
            title="Card Presentation"
            description="Classic centered modal for desktop interfaces"
            onClose={() => closeModal('card')}
          />
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center">
              <Monitor className="w-8 h-8 text-white" />
            </div>
            <p className="text-body-md text-gray-600 dark:text-gray-400">
              This modal uses the card presentation style with backdrop blur and smooth animations.
              Perfect for confirmations, simple forms, and focused tasks.
            </p>
            
            <AppleModalFooter
              primaryAction={{
                label: "Got it",
                onClick: () => closeModal('card'),
              }}
            />
          </div>
        </AppleModal>

        {/* Popover Modal */}
        <AppleModal
          isOpen={modals.popover}
          onClose={() => closeModal('popover')}
          presentationStyle="popover"
          size="sm"
        >
          <AppleModalHeader
            title="Notifications"
            onClose={() => closeModal('popover')}
          />
          
          <AppleModalListLayout>
            <AppleModalListItem>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-body-md font-medium">New reservation</p>
                  <p className="text-caption-lg text-gray-600 dark:text-gray-400">
                    Court 1 booked for tomorrow
                  </p>
                </div>
              </div>
            </AppleModalListItem>
            
            <AppleModalListItem>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="text-body-md font-medium">Payment received</p>
                  <p className="text-caption-lg text-gray-600 dark:text-gray-400">
                    Tournament registration confirmed
                  </p>
                </div>
              </div>
            </AppleModalListItem>
          </AppleModalListLayout>
        </AppleModal>

        {/* Fullscreen Modal */}
        <AppleModal
          isOpen={modals.fullscreen}
          onClose={() => closeModal('fullscreen')}
          presentationStyle="fullscreen"
        >
          <AppleModalHeader
            title="System Settings"
            description="Comprehensive settings for your padel club management"
            onClose={() => closeModal('fullscreen')}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Settings Categories */}
            <div className="space-y-2">
              <h3 className="text-ui-lg font-medium text-gray-900 dark:text-white mb-4">
                Categories
              </h3>
              {[
                { icon: Globe, label: 'General', active: true },
                { icon: User, label: 'Account' },
                { icon: Bell, label: 'Notifications' },
                { icon: Shield, label: 'Privacy' },
                { icon: Palette, label: 'Appearance' },
              ].map((item, index) => (
                <button
                  key={index}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                    item.active
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-body-md">{item.label}</span>
                </button>
              ))}
            </div>
            
            {/* Settings Content */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-headline-sm font-medium text-gray-900 dark:text-white mb-4">
                  Club Information
                </h4>
                <div className="space-y-4">
                  <div>
                    <Label>Club Name</Label>
                    <Input className="mt-2" defaultValue="Central Padel Club" />
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Input className="mt-2" defaultValue="123 Sports Avenue" />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input className="mt-2" defaultValue="info@centralpadel.com" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
                <h4 className="text-headline-sm font-medium text-gray-900 dark:text-white mb-4">
                  Operating Hours
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Opening Time</Label>
                    <Input type="time" className="mt-2" defaultValue="08:00" />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input type="time" className="mt-2" defaultValue="22:00" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </AppleModal>

        {/* Form Layout Modal */}
        <AppleModal
          isOpen={modals.form}
          onClose={() => closeModal('form')}
          size="xl" as any
        >
          <AppleModalHeader
            title="Create User Profile"
            description="Set up a new user account with complete information"
            onClose={() => closeModal('form')}
          />
          
          <AppleModalFormLayout>
            <AppleModalFormSection
              title="Personal Information"
              description="Basic details about the user"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input className="mt-2" placeholder="John" />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input className="mt-2" placeholder="Doe" />
                </div>
              </div>
              
              <div>
                <Label>Email Address</Label>
                <Input type="email" className="mt-2" placeholder="john@example.com" />
              </div>
            </AppleModalFormSection>
            
            <AppleModalFormSection
              title="Account Settings"
              description="Configure access and permissions"
            >
              <div>
                <Label>Role</Label>
                <Select>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label>Permissions</Label>
                <div className="space-y-2">
                  {[
                    'Manage reservations',
                    'View financial reports',
                    'Modify court settings',
                    'Access user management'
                  ].map((permission, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Switch id={`permission-${index}`} />
                      <Label htmlFor={`permission-${index}`} className="text-body-sm">
                        {permission}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </AppleModalFormSection>
            
            <AppleModalFooter
              primaryAction={{
                label: "Create Account",
                onClick: () => closeModal('form'),
              }}
              secondaryAction={{
                label: "Cancel",
                onClick: () => closeModal('form'),
              }}
            />
          </AppleModalFormLayout>
        </AppleModal>

        {/* List Layout Modal */}
        <AppleModal
          isOpen={modals.list}
          onClose={() => closeModal('list')}
          size="md"
        >
          <AppleModalHeader
            title="Choose Theme"
            description="Select your preferred appearance"
            onClose={() => closeModal('list')}
          />
          
          <AppleModalListLayout>
            {[
              { id: 'light', name: 'Light', description: 'Clean and bright interface' },
              { id: 'dark', name: 'Dark', description: 'Easy on the eyes' },
              { id: 'auto', name: 'Auto', description: 'Matches system preference' },
            ].map((theme) => (
              <AppleModalListItem
                key={theme.id}
                selected={selectedOption === theme.id}
                onClick={() => setSelectedOption(theme.id)}
              >
                <div>
                  <p className="text-body-md font-medium">{theme.name}</p>
                  <p className="text-caption-lg text-gray-600 dark:text-gray-400">
                    {theme.description}
                  </p>
                </div>
              </AppleModalListItem>
            ))}
          </AppleModalListLayout>
          
          <AppleModalFooter
            primaryAction={{
              label: "Apply Theme",
              onClick: () => closeModal('list'),
              disabled: !selectedOption,
            }}
            secondaryAction={{
              label: "Cancel",
              onClick: () => closeModal('list'),
            }}
          />
        </AppleModal>

        {/* Info Layout Modal */}
        <AppleModal
          isOpen={modals.info}
          onClose={() => closeModal('info')}
          size="lg"
        >
          <AppleModalHeader
            title="System Information"
            description="Current system status and details"
            onClose={() => closeModal('info')}
          />
          
          <AppleModalInfoLayout>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-ui-md font-medium text-green-800 dark:text-green-200">
                  System Healthy
                </span>
              </div>
              <p className="text-body-sm text-green-700 dark:text-green-300">
                All services are running normally
              </p>
            </div>
            
            <div className="space-y-4">
              <AppleModalInfoItem
                label="Version"
                value="2.1.0"
              />
              <AppleModalInfoItem
                label="Last Updated"
                value="December 15, 2024"
              />
              <AppleModalInfoItem
                label="Active Users"
                value="1,234"
              />
              <AppleModalInfoItem
                label="Storage Used"
                value="45.2 GB / 100 GB"
              />
              <AppleModalInfoItem
                label="Uptime"
                value="99.9%"
              />
            </div>
          </AppleModalInfoLayout>
        </AppleModal>

        {/* Multi-step Modal */}
        <AppleModal
          isOpen={modals.multiStep}
          onClose={() => closeModal('multiStep')}
          size="xl" as any
        >
          <AppleModalHeader
            title="Tournament Setup"
            description={`Step ${currentStep} of 3`}
            onClose={() => closeModal('multiStep')}
          />
          
          <AppleModalProgressIndicator
            currentStep={currentStep}
            totalSteps={3}
            steps={['Basic Info', 'Configuration', 'Review']}
          />
          
          <div className="mt-6">
            {currentStep === 1 && (
              <AppleModalFormLayout>
                <AppleModalFormSection title="Tournament Details">
                  <div>
                    <Label>Tournament Name</Label>
                    <Input className="mt-2" placeholder="Summer Championship 2024" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="date" className="mt-2" />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="date" className="mt-2" />
                    </div>
                  </div>
                </AppleModalFormSection>
              </AppleModalFormLayout>
            )}
            
            {currentStep === 2 && (
              <AppleModalFormLayout>
                <AppleModalFormSection title="Tournament Configuration">
                  <div>
                    <Label>Format</Label>
                    <Select>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="knockout">Knockout</SelectItem>
                        <SelectItem value="round-robin">Round Robin</SelectItem>
                        <SelectItem value="swiss">Swiss System</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Maximum Teams</Label>
                    <Select>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Select max teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16">16 teams</SelectItem>
                        <SelectItem value="32">32 teams</SelectItem>
                        <SelectItem value="64">64 teams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AppleModalFormSection>
              </AppleModalFormLayout>
            )}
            
            {currentStep === 3 && (
              <AppleModalInfoLayout>
                <h3 className="text-headline-sm font-medium text-gray-900 dark:text-white mb-4">
                  Review Tournament Setup
                </h3>
                <AppleModalInfoItem
                  label="Tournament Name"
                  value="Summer Championship 2024"
                />
                <AppleModalInfoItem
                  label="Format"
                  value="Knockout"
                />
                <AppleModalInfoItem
                  label="Maximum Teams"
                  value="32 teams"
                />
                <AppleModalInfoItem
                  label="Duration"
                  value="June 15 - June 17, 2024"
                />
              </AppleModalInfoLayout>
            )}
          </div>
          
          <AppleModalFooter
            primaryAction={{
              label: currentStep === 3 ? "Create Tournament" : "Next",
              onClick: currentStep === 3 ? () => closeModal('multiStep') : nextStep,
            }}
            secondaryAction={{
              label: currentStep === 1 ? "Cancel" : "Back",
              onClick: currentStep === 1 ? () => closeModal('multiStep') : prevStep,
            }}
          />
        </AppleModal>
      </div>
    </div>
  );
};