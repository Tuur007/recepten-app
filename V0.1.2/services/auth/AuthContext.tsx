/**
 * Firebase Authentication Service
 * Handles user authentication and session management
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
  AuthError,
} from 'firebase/auth';
import { auth } from './config';

export interface AuthUser {
  uid: string;
  email: string | null;
  isAnonymous: boolean;
  displayName: string | null;
}

type AuthStateCallback = (user: AuthUser | null) => void;

export class FirebaseAuthService {
  private static instance: FirebaseAuthService;
  private auth: Auth;
  private listeners: Set<AuthStateCallback> = new Set();

  private constructor() {
    this.auth = auth;
    
    // Setup internal auth state listener
    onAuthStateChanged(this.auth, (firebaseUser) => {
      const authUser = firebaseUser ? this.userToAuthUser(firebaseUser) : null;
      this.notifyListeners(authUser);
    });
  }

  static getInstance(): FirebaseAuthService {
    if (!FirebaseAuthService.instance) {
      FirebaseAuthService.instance = new FirebaseAuthService();
    }
    return FirebaseAuthService.instance;
  }

  /**
   * Register new user with email and password
   */
  async register(email: string, password: string): Promise<AuthUser> {
    try {
      if (!email?.trim()) {
        throw new Error('E-mailadres is verplicht');
      }
      if (!password || password.length < 6) {
        throw new Error('Wachtwoord moet minstens 6 karakters lang zijn');
      }

      const userCredential = await createUserWithEmailAndPassword(
        this.auth,
        email.trim(),
        password,
      );

      return this.userToAuthUser(userCredential.user);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in user with email and password
   */
  async signIn(email: string, password: string): Promise<AuthUser> {
    try {
      if (!email?.trim()) {
        throw new Error('E-mailadres is verplicht');
      }
      if (!password) {
        throw new Error('Wachtwoord is verplicht');
      }

      const userCredential = await signInWithEmailAndPassword(
        this.auth,
        email.trim(),
        password,
      );

      return this.userToAuthUser(userCredential.user);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in anonymously (for guest users)
   */
  async signInAnonymously(): Promise<AuthUser> {
    try {
      const userCredential = await signInAnonymously(this.auth);
      return this.userToAuthUser(userCredential.user);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
    } catch (error) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current authenticated user
   */
  getCurrentUser(): AuthUser | null {
    const user = this.auth.currentUser;
    if (!user) return null;
    return this.userToAuthUser(user);
  }

  /**
   * Subscribe to authentication state changes
   */
  onAuthStateChanged(callback: AuthStateCallback): () => void {
    this.listeners.add(callback);
    
    // Call immediately with current user
    const currentUser = this.getCurrentUser();
    callback(currentUser);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(user: AuthUser | null): void {
    this.listeners.forEach((callback) => {
      try {
        callback(user);
      } catch (error) {
        console.error('[FirebaseAuthService] Listener error:', error);
      }
    });
  }

  /**
   * Convert Firebase User to AuthUser
   */
  private userToAuthUser(user: User): AuthUser {
    return {
      uid: user.uid,
      email: user.email,
      isAnonymous: user.isAnonymous,
      displayName: user.displayName,
    };
  }

  /**
   * Handle Firebase auth errors with user-friendly messages
   */
  private handleAuthError(error: unknown): Error {
    const authError = error as AuthError;
    
    const errorMessages: Record<string, string> = {
      'auth/email-already-in-use': 'Dit e-mailadres is al geregistreerd',
      'auth/invalid-email': 'Ongeldig e-mailadres',
      'auth/weak-password': 'Wachtwoord is te zwak (minimaal 6 karakters)',
      'auth/user-not-found': 'Geen account gevonden met dit e-mailadres',
      'auth/wrong-password': 'Verkeerd wachtwoord',
      'auth/too-many-requests': 'Te veel aanmeldpogingen, probeer later opnieuw',
      'auth/operation-not-allowed': 'Aanmelden is niet ingeschakeld',
      'auth/network-request-failed': 'Netwerkfout, controleer je verbinding',
      'auth/invalid-credential': 'E-mailadres of wachtwoord is onjuist',
    };

    const message = authError.code 
      ? errorMessages[authError.code] || authError.message || 'Authenticatiefout'
      : authError.message || 'Authenticatiefout';
    
    return new Error(message);
  }
}

export const authService = FirebaseAuthService.getInstance();
