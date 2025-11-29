const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface User {
  id: number;
  email: string;
  credits: number;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface CreditPackage {
  id: number;
  name: string;
  credits: number;
  price_jpy: number;
  unit_price: number;
  discount_percentage: number;
  description: string;
}

interface ConsumeCreditsResponse {
  success: boolean;
  creditsUsed: number;
  newBalance: number;
  stampsGenerated: number;
}

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('authToken');
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.setToken(data.token);
    return data;
  }

  async getCreditBalance(): Promise<{ credits: number }> {
    const response = await fetch(`${API_BASE_URL}/credits/balance`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch balance');
    }

    return response.json();
  }

  async consumeCredits(resolution: '1K' | '4K'): Promise<ConsumeCreditsResponse> {
    const response = await fetch(`${API_BASE_URL}/credits/consume`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ resolution }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to consume credits');
    }

    return response.json();
  }

  async getPackages(): Promise<{ packages: CreditPackage[] }> {
    const response = await fetch(`${API_BASE_URL}/packages`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch packages');
    }

    return response.json();
  }

  async purchasePackage(packageId: number, paymentMethod: string = 'stripe'): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/packages/purchase`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ packageId, paymentMethod }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Purchase failed');
    }

    return response.json();
  }

  async createStripeCheckout(packageId: number): Promise<{ sessionId: string; url: string }> {
    const response = await fetch(`${API_BASE_URL}/stripe/create-checkout-session`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ packageId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return response.json();
  }

  async getCheckoutSession(sessionId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/stripe/checkout-session/${sessionId}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get checkout session');
    }

    return response.json();
  }

  async getUsageHistory(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/credits/history?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch history');
    }

    return response.json();
  }

  async getPurchaseHistory(limit: number = 50, offset: number = 0): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/packages/history?limit=${limit}&offset=${offset}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch purchase history');
    }

    return response.json();
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }
}

export const apiService = new ApiService();
export type { User, CreditPackage, ConsumeCreditsResponse };
