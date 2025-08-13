import { Page } from '@playwright/test';
import { TestData, DataGenerators } from './test-data';

/**
 * Clase centralizada para manejar todos los mocks de API del sistema Padelyzer
 */
export class PadelyzerMocks {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Setup completo de todos los mocks
  async setupAllMocks(): Promise<void> {
    await Promise.all([
      this.setupAuthMocks(),
      this.setupClubsMocks(),
      this.setupClientsMocks(),
      this.setupReservationsMocks(),
      this.setupCourtsMocks(),
      this.setupTournamentsMocks(),
      this.setupClassesMocks(),
      this.setupFinanceMocks(),
      this.setupPaymentsMocks(),
      this.setupAnalyticsMocks()
    ]);
  }

  // Mocks de autenticación
  async setupAuthMocks(): Promise<void> {
    await this.page.route('**/api/v1/auth/login/', async route => {
      const postData = route.request().postDataJSON();
      
      if (postData.email === TestData.auth.admin.email && postData.password === TestData.auth.admin.password) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwidXNlcl9pZCI6MSwiZXhwIjo5OTk5OTk5OTk5fQ.mock_access_token',
            refresh: 'mock_refresh_token',
            user: TestData.auth.admin.user
          })
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Invalid credentials' })
        });
      }
    });

    await this.page.route('**/api/v1/auth/profile/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(TestData.auth.admin.user)
      });
    });

    await this.page.route('**/api/v1/auth/token/refresh/', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwidXNlcl9pZCI6MSwiZXhwIjo5OTk5OTk5OTk5fQ.refreshed_token'
        })
      });
    });
  }

  // Mocks de clubes
  async setupClubsMocks(): Promise<void> {
    await this.page.route('**/api/v1/clubs/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET' && url.includes('/clubs/') && !url.includes('/clubs/new')) {
        // GET club individual
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'club-123',
            ...TestData.clubs.valid,
            slug: 'club-padel-madrid-centro',
            courts_count: 4,
            active_members_count: 125,
            created_at: '2024-01-15T10:00:00Z'
          })
        });
      } else if (method === 'GET') {
        // GET lista de clubs
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 3,
            results: [
              {
                id: 'club-123',
                ...TestData.clubs.valid,
                slug: 'club-padel-madrid-centro',
                courts_count: 4,
                active_members_count: 125
              },
              {
                id: 'club-456',
                ...TestData.clubs.secondary,
                slug: 'club-padel-barcelona',
                courts_count: 6,
                active_members_count: 89
              }
            ]
          })
        });
      } else if (method === 'POST') {
        // POST crear club
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('club'),
            ...postData,
            slug: postData.name.toLowerCase().replace(/\s+/g, '-'),
            courts_count: 0,
            active_members_count: 0,
            created_at: new Date().toISOString()
          })
        });
      } else if (method === 'PUT' || method === 'PATCH') {
        // PUT/PATCH actualizar club
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'club-123',
            ...TestData.clubs.valid,
            ...postData,
            updated_at: new Date().toISOString()
          })
        });
      } else if (method === 'DELETE') {
        // DELETE eliminar club
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Club deleted successfully' })
        });
      }
    });
  }

  // Mocks de clientes
  async setupClientsMocks(): Promise<void> {
    await this.page.route('**/api/v1/clients/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET' && url.includes('/search')) {
        // GET buscar clientes
        const query = new URL(url).searchParams.get('q') || '';
        
        if (query.includes('666123456') || query.includes('juan.garcia')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'client-123',
                ...TestData.clients.registered,
                total_bookings: 25,
                last_booking: '2024-08-01T10:00:00Z'
              }
            ])
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([])
          });
        }
      } else if (method === 'GET') {
        // GET lista de clientes
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 2,
            results: [
              {
                id: 'client-123',
                ...TestData.clients.registered,
                total_bookings: 25
              },
              {
                id: 'client-456',
                ...TestData.clients.secondary,
                total_bookings: 18
              }
            ]
          })
        });
      } else if (method === 'POST') {
        // POST crear cliente
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('client'),
            ...postData,
            total_bookings: 0,
            created_at: new Date().toISOString()
          })
        });
      }
    });
  }

  // Mocks de reservas
  async setupReservationsMocks(): Promise<void> {
    await this.page.route('**/api/v1/reservations/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET' && url.includes('/availability')) {
        // GET disponibilidad
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            date: '2024-08-15',
            courts: [
              {
                id: 'court-456',
                ...TestData.courts.covered,
                time_slots: TestData.timeSlots
              },
              {
                id: 'court-789',
                ...TestData.courts.outdoor,
                time_slots: TestData.timeSlots
              }
            ]
          })
        });
      } else if (method === 'GET') {
        // GET lista de reservas
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 3,
            results: [
              {
                id: 'reservation-123',
                client: TestData.clients.registered,
                court: TestData.courts.covered,
                ...TestData.reservations.valid,
                status: 'confirmed',
                confirmation_code: 'RES123ABC',
                created_at: '2024-08-10T09:00:00Z'
              },
              {
                id: 'reservation-456',
                visitor_name: TestData.clients.visitor.name,
                visitor_phone: TestData.clients.visitor.phone,
                court: TestData.courts.outdoor,
                ...TestData.reservations.visitor,
                status: 'confirmed',
                confirmation_code: 'RES456DEF'
              }
            ]
          })
        });
      } else if (method === 'POST') {
        // POST crear reserva
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('reservation'),
            ...postData,
            status: 'confirmed',
            confirmation_code: DataGenerators.confirmationCode(),
            created_at: new Date().toISOString()
          })
        });
      } else if (method === 'DELETE') {
        // DELETE cancelar reserva
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            status: 'cancelled',
            refund_amount: 45.00,
            message: 'Reservation cancelled successfully'
          })
        });
      }
    });
  }

  // Mocks de canchas
  async setupCourtsMocks(): Promise<void> {
    await this.page.route('**/api/v1/courts/**', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 'court-456', ...TestData.courts.covered },
            { id: 'court-789', ...TestData.courts.outdoor },
            { id: 'court-premium', ...TestData.courts.premium }
          ])
        });
      } else if (method === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('court'),
            ...postData,
            created_at: new Date().toISOString()
          })
        });
      }
    });
  }

  // Mocks de torneos
  async setupTournamentsMocks(): Promise<void> {
    await this.page.route('**/api/v1/tournaments/**', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 2,
            results: [
              {
                id: 'tournament-123',
                ...TestData.tournaments.upcoming,
                participants_count: 8,
                status: 'registration_open'
              },
              {
                id: 'tournament-456',
                ...TestData.tournaments.category_based,
                participants_count: 12,
                status: 'upcoming'
              }
            ]
          })
        });
      } else if (method === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('tournament'),
            ...postData,
            participants_count: 0,
            status: 'registration_open',
            created_at: new Date().toISOString()
          })
        });
      }
    });
  }

  // Mocks de clases
  async setupClassesMocks(): Promise<void> {
    await this.page.route('**/api/v1/classes/**', async route => {
      const method = route.request().method();
      
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 2,
            results: [
              {
                id: 'class-123',
                ...TestData.classes.group,
                enrolled_students: 6,
                status: 'active'
              },
              {
                id: 'class-456',
                ...TestData.classes.private,
                enrolled_students: 1,
                status: 'scheduled'
              }
            ]
          })
        });
      } else if (method === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('class'),
            ...postData,
            enrolled_students: 0,
            status: 'scheduled',
            created_at: new Date().toISOString()
          })
        });
      }
    });
  }

  // Mocks de finanzas
  async setupFinanceMocks(): Promise<void> {
    await this.page.route('**/api/v1/finance/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (method === 'GET' && url.includes('/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TestData.analytics.financial_summary)
        });
      } else if (method === 'GET' && url.includes('/transactions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 2,
            results: [
              {
                id: 'transaction-123',
                ...TestData.finance.income,
                type: 'income'
              },
              {
                id: 'transaction-456',
                ...TestData.finance.expense,
                type: 'expense'
              }
            ]
          })
        });
      } else if (method === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: DataGenerators.uniqueId('transaction'),
            ...postData,
            created_at: new Date().toISOString()
          })
        });
      }
    });
  }

  // Mocks de pagos
  async setupPaymentsMocks(): Promise<void> {
    await this.page.route('**/api/v1/payments/**', async route => {
      const method = route.request().method();
      
      if (method === 'POST') {
        const postData = route.request().postDataJSON();
        
        // Simular diferentes escenarios de pago
        if (postData.card_number === '4000000000000002') {
          // Tarjeta rechazada
          await route.fulfill({
            status: 402,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Payment declined',
              error_code: 'card_declined'
            })
          });
        } else {
          // Pago exitoso
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              id: DataGenerators.uniqueId('payment'),
              status: 'completed',
              amount: postData.amount,
              transaction_id: DataGenerators.uniqueId('txn'),
              processed_at: new Date().toISOString()
            })
          });
        }
      } else if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            count: 1,
            results: [
              {
                id: 'payment-123',
                ...TestData.payments.card,
                amount: 45.00,
                status: 'completed',
                processed_at: '2024-08-10T10:00:00Z'
              }
            ]
          })
        });
      }
    });
  }

  // Mocks de analíticas
  async setupAnalyticsMocks(): Promise<void> {
    await this.page.route('**/api/v1/analytics/**', async route => {
      const method = route.request().method();
      const url = route.request().url();
      
      if (url.includes('/occupancy')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TestData.analytics.occupancy)
        });
      } else if (url.includes('/clients')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TestData.analytics.client_stats)
        });
      } else if (url.includes('/financial')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TestData.analytics.financial_summary)
        });
      } else {
        // Dashboard general
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...TestData.analytics.occupancy,
            ...TestData.analytics.client_stats,
            ...TestData.analytics.financial_summary
          })
        });
      }
    });
  }

  // Métodos para escenarios específicos
  async mockErrorResponse(pattern: string, statusCode: number = 500, message: string = 'Internal server error'): Promise<void> {
    await this.page.route(pattern, async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ detail: message })
      });
    });
  }

  async mockSlowResponse(pattern: string, delayMs: number = 3000): Promise<void> {
    await this.page.route(pattern, async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Slow response' })
      });
    });
  }

  async mockEmptyResponse(pattern: string): Promise<void> {
    await this.page.route(pattern, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 0,
          results: []
        })
      });
    });
  }
}

// Factory function para facilitar el uso
export function createMocks(page: Page): PadelyzerMocks {
  return new PadelyzerMocks(page);
}
