import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { 
  FormError, 
  FieldError, 
  FormErrorSummary, 
  InlineError,
  ErrorToast 
} from './form-error';
import { ErrorBoundary } from './error-boundary-enhanced';
import { Button } from './button';
import { Input } from './input';
import { Label } from './label';
import { Card, CardContent, CardHeader, CardTitle } from './card';

const meta = {
  title: 'UI/Error Handling',
  parameters: {
    layout: 'padded',
  },
} satisfies Meta;

export default meta;

export const FormErrors = {
  render: () => {
    const [showErrors, setShowErrors] = useState(true);

    return (
      <div className="space-y-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Form Error Examples</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Single Error */}
            <div>
              <Label>Single Error Message</Label>
              <Input className="border-destructive" />
              <FormError message="This field is required" />
            </div>

            {/* Multiple Errors */}
            <div>
              <Label>Multiple Error Messages</Label>
              <Input className="border-destructive" />
              <FormError 
                message={[
                  'Password must be at least 8 characters',
                  'Password must contain a number',
                  'Password must contain a special character'
                ]} 
              />
            </div>

            {/* Without Icon */}
            <div>
              <Label>Error Without Icon</Label>
              <Input className="border-destructive" />
              <FormError message="Invalid email format" showIcon={false} />
            </div>

            {/* Toggle Example */}
            <div>
              <Label>Animated Error (Toggle to see animation)</Label>
              <Input className={showErrors ? 'border-destructive' : ''} />
              {showErrors && <FormError message="This will animate in/out" />}
              <Button 
                onClick={() => setShowErrors(!showErrors)} 
                variant="outline" 
                size="sm"
                className="mt-2"
              >
                Toggle Error
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
};

export const FieldErrors = {
  render: () => {
    const errors = {
      username: { message: 'Username is already taken' },
      email: 'Please enter a valid email address',
      password: { message: 'Password is too weak' },
    };

    return (
      <div className="space-y-6 max-w-md">
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" className="border-destructive" />
          <FieldError name="username" errors={errors} />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="border-destructive" />
          <FieldError name="email" errors={errors} />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" className="border-destructive" />
          <FieldError name="password" errors={errors} />
        </div>
      </div>
    );
  },
};

export const ErrorSummary = {
  render: () => {
    const errors = {
      username: { message: 'Username must be at least 3 characters' },
      email: 'Email is required',
      password: { message: 'Password must be at least 8 characters' },
      terms: 'You must accept the terms and conditions',
    };

    return (
      <div className="space-y-6 max-w-2xl">
        <FormErrorSummary errors={errors} />
        
        <form className="space-y-4">
          <div>
            <Label htmlFor="form-username">Username</Label>
            <Input id="form-username" className="border-destructive" />
          </div>
          <div>
            <Label htmlFor="form-email">Email</Label>
            <Input id="form-email" type="email" className="border-destructive" />
          </div>
          <div>
            <Label htmlFor="form-password">Password</Label>
            <Input id="form-password" type="password" className="border-destructive" />
          </div>
          <Button type="submit">Submit</Button>
        </form>
      </div>
    );
  },
};

export const InlineErrors = {
  render: () => {
    const [touched, setTouched] = useState({
      email: false,
      password: false,
    });

    return (
      <div className="space-y-4 max-w-md">
        <div>
          <Label htmlFor="inline-email">Email</Label>
          <Input 
            id="inline-email" 
            type="email"
            onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
            className={touched.email ? 'border-destructive' : ''}
          />
          <InlineError error="Invalid email format" touched={touched.email} />
        </div>

        <div>
          <Label htmlFor="inline-password">Password</Label>
          <Input 
            id="inline-password" 
            type="password"
            onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
            className={touched.password ? 'border-destructive' : ''}
          />
          <InlineError error="Password is required" touched={touched.password} />
        </div>
      </div>
    );
  },
};

export const ErrorToastDemo = {
  render: () => {
    const [showToast, setShowToast] = useState(false);

    return (
      <div>
        <Button onClick={() => setShowToast(true)}>
          Show Error Toast
        </Button>
        
        {showToast && (
          <ErrorToast 
            message="Failed to save changes. Please try again." 
            onClose={() => setShowToast(false)}
          />
        )}
      </div>
    );
  },
};

// Error Boundary Examples
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('This is a test error!');
  }
  return <div>Component rendered successfully</div>;
};

export const ErrorBoundaryPage = {
  render: () => {
    const [throwError, setThrowError] = useState(false);

    return (
      <ErrorBoundary 
        level="page"
        onError={(error, errorInfo) => {
                  }}
      >
        <div className="space-y-4">
          <h2>Page Level Error Boundary</h2>
          <Button onClick={() => setThrowError(true)}>
            Trigger Error
          </Button>
          <ThrowError shouldThrow={throwError} />
        </div>
      </ErrorBoundary>
    );
  },
};

export const ErrorBoundarySection = {
  render: () => {
    const [throwError, setThrowError] = useState(false);

    return (
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h3>Normal Section</h3>
          <p>This section is outside the error boundary</p>
        </div>
        
        <ErrorBoundary level="section">
          <div className="p-4 border rounded">
            <h3>Protected Section</h3>
            <Button onClick={() => setThrowError(true)} size="sm">
              Trigger Error in This Section
            </Button>
            <ThrowError shouldThrow={throwError} />
          </div>
        </ErrorBoundary>
        
        <div className="p-4 border rounded">
          <h3>Another Normal Section</h3>
          <p>This section continues to work even if the above fails</p>
        </div>
      </div>
    );
  },
};

export const ErrorBoundaryComponent = {
  render: () => {
    const [throwError1, setThrowError1] = useState(false);
    const [throwError2, setThrowError2] = useState(false);

    return (
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Component 1</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorBoundary level="component">
              <Button onClick={() => setThrowError1(true)} size="sm">
                Break This Component
              </Button>
              <ThrowError shouldThrow={throwError1} />
            </ErrorBoundary>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Component 2</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorBoundary level="component">
              <Button onClick={() => setThrowError2(true)} size="sm">
                Break This Component
              </Button>
              <ThrowError shouldThrow={throwError2} />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    );
  },
};