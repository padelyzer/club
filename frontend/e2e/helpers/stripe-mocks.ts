import { Page } from '@playwright/test';

export async function mockStripeElements(page: Page) {
  // Mock Stripe.js
  await page.addInitScript(() => {
    window.Stripe = function(publishableKey: string) {
      return {
        elements: () => ({
          create: (type: string, options: any) => ({
            mount: (element: string | HTMLElement) => {},
            on: (event: string, handler: Function) => {
              if (event === 'ready') {
                setTimeout(() => handler(), 100);
              }
            },
            unmount: () => {},
            destroy: () => {}
          })
        }),
        confirmCardPayment: async (clientSecret: string, data: any) => {
          // Simulate successful payment by default
          if (data.payment_method.card.number === '4000000000000002') {
            return {
              error: {
                type: 'card_error',
                message: 'Your card was declined.'
              }
            };
          }
          
          if (data.payment_method.card.number === '4000002500003155') {
            // Simulate 3D Secure
            return {
              paymentIntent: {
                status: 'requires_action',
                next_action: {
                  type: 'use_stripe_sdk'
                }
              }
            };
          }
          
          return {
            paymentIntent: {
              id: 'pi_test_' + Math.random().toString(36).substr(2, 9),
              status: 'succeeded'
            }
          };
        },
        handleCardAction: async (clientSecret: string) => {
          return {
            paymentIntent: {
              status: 'succeeded'
            }
          };
        },
        createPaymentMethod: async (data: any) => {
          return {
            paymentMethod: {
              id: 'pm_test_' + Math.random().toString(36).substr(2, 9),
              card: {
                last4: data.card.number.slice(-4),
                brand: 'visa'
              }
            }
          };
        }
      };
    };
  });
}

export async function mockStripeWebhook(page: Page, event: string, data: any) {
  return page.evaluate(async ({ event, data }) => {
    const response = await fetch('/api/finance/webhooks/stripe/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_webhook_signature'
      },
      body: JSON.stringify({
        type: event,
        data: {
          object: data
        }
      })
    });
    
    return response.ok();
  }, { event, data });
}

export async function waitForStripeElement(page: Page, selector: string) {
  await page.waitForFunction(
    (sel) => {
      const iframe = document.querySelector('iframe[name="stripe-card-element"]');
      if (!iframe) return false;
      
      try {
        const iframeDoc = (iframe as HTMLIFrameElement).contentDocument;
        return iframeDoc?.querySelector(sel) !== null;
      } catch (e) {
        return false;
      }
    },
    selector,
    { timeout: 10000 }
  );
}

export function generateTestCard(type: 'success' | 'decline' | '3ds' | 'insufficient') {
  const cards = {
    success: '4242424242424242',
    decline: '4000000000000002',
    '3ds': '4000002500003155',
    insufficient: '4000000000009995'
  };
  
  return cards[type];
}