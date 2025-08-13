import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './input';
import { Label } from './label';
import { Search, Mail, Lock, User } from 'lucide-react';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'number', 'search', 'tel', 'url'],
    },
    disabled: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Enter text...',
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email">Email</Label>
      <Input type="email" id="email" placeholder="Email" />
    </div>
  ),
};

export const WithHelperText: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="username">Username</Label>
      <Input type="text" id="username" placeholder="Enter username" />
      <p className="text-sm text-muted-foreground">
        This will be your public display name.
      </p>
    </div>
  ),
};

export const WithError: Story = {
  render: () => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="email-error">Email</Label>
      <Input 
        type="email" 
        id="email-error" 
        placeholder="Email" 
        className="border-red-500 focus:border-red-500"
      />
      <p className="text-sm text-red-500">
        Please enter a valid email address.
      </p>
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled input',
    disabled: true,
  },
};

export const WithIcon: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search..." className="pl-8" />
      </div>
      
      <div className="relative">
        <Mail className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="email" placeholder="Email" className="pl-8" />
      </div>
      
      <div className="relative">
        <Lock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input type="password" placeholder="Password" className="pl-8" />
      </div>
    </div>
  ),
};

export const InputTypes: Story = {
  render: () => (
    <div className="space-y-4 w-full max-w-sm">
      <div>
        <Label>Text</Label>
        <Input type="text" placeholder="Text input" />
      </div>
      
      <div>
        <Label>Email</Label>
        <Input type="email" placeholder="email@example.com" />
      </div>
      
      <div>
        <Label>Password</Label>
        <Input type="password" placeholder="••••••••" />
      </div>
      
      <div>
        <Label>Number</Label>
        <Input type="number" placeholder="0" />
      </div>
      
      <div>
        <Label>Search</Label>
        <Input type="search" placeholder="Search..." />
      </div>
      
      <div>
        <Label>Tel</Label>
        <Input type="tel" placeholder="+1 (555) 000-0000" />
      </div>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 w-full max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="fullname">Full Name</Label>
        <Input id="fullname" placeholder="John Doe" required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-email">Email</Label>
        <Input 
          id="form-email" 
          type="email" 
          placeholder="john.doe@example.com" 
          required 
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="form-password">Password</Label>
        <Input 
          id="form-password" 
          type="password" 
          placeholder="••••••••" 
          required 
        />
      </div>
      
      <button 
        type="submit" 
        className="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary/90"
      >
        Submit
      </button>
    </form>
  ),
};