/**
 * Unit tests to verify the three bug fixes:
 * 1. No console.log statements in register-form.tsx
 * 2. refreshSession properly returns AuthSession when token is valid
 * 3. useToast useEffect has empty dependency array
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Bug Fix Verification', () => {
  
  describe('Bug 1: Console.log statements removed from register-form.tsx', () => {
    let registerFormContent: string;
    
    beforeAll(() => {
      const filePath = path.join(__dirname, '../components/auth/register-form.tsx');
      registerFormContent = fs.readFileSync(filePath, 'utf-8');
    });
    
    it('should not contain console.log for form submission data', () => {
      expect(registerFormContent).not.toMatch(/console\.log\s*\(\s*["']Form submitted/);
    });
    
    it('should not contain console.log for registration response', () => {
      expect(registerFormContent).not.toMatch(/console\.log\s*\(\s*["']Registration response/);
    });
    
    it('should not contain console.log for password visibility toggle', () => {
      expect(registerFormContent).not.toMatch(/console\.log\s*\(\s*["']Toggle password visibility/);
    });
    
    it('should have clean onClick handler for password toggle', () => {
      // The onClick should be a simple arrow function, not one with console.log
      expect(registerFormContent).toMatch(/onClick=\{\s*\(\)\s*=>\s*setShowPassword\s*\(\s*!showPassword\s*\)\s*\}/);
    });
  });
  
  describe('Bug 2: refreshSession returns valid AuthSession', () => {
    let authContent: string;
    
    beforeAll(() => {
      const filePath = path.join(__dirname, '../lib/auth.ts');
      authContent = fs.readFileSync(filePath, 'utf-8');
    });
    
    it('should not have standalone "return null" after valid token verification', () => {
      // The old buggy code had a comment followed immediately by "return null"
      // The fix should have actual logic to generate tokens
      expect(authContent).not.toMatch(/\/\/ In a real app.*\n\s*\/\/ For now.*\n\s*return null;/);
    });
    
    it('should import users store in refreshSession', () => {
      // The fix imports users store to fetch user data
      expect(authContent).toMatch(/import.*["']@\/lib\/stores["']/);
    });
    
    it('should call createAccessToken in refreshSession flow', () => {
      // After the refreshSession function definition, it should call createAccessToken
      const refreshSessionMatch = authContent.match(/async function refreshSession[\s\S]*?^}/m);
      if (refreshSessionMatch) {
        expect(refreshSessionMatch[0]).toMatch(/createAccessToken/);
      } else {
        // If we can't find the function, check the whole file has the pattern
        expect(authContent).toMatch(/refreshSession[\s\S]*createAccessToken/);
      }
    });
    
    it('should call createRefreshToken in refreshSession flow', () => {
      expect(authContent).toMatch(/refreshSession[\s\S]*createRefreshToken/);
    });
    
    it('should call setAuthCookies in refreshSession flow', () => {
      expect(authContent).toMatch(/refreshSession[\s\S]*setAuthCookies/);
    });
    
    it('should return an AuthSession object with userId, email, and expiresAt', () => {
      // The return statement should include userId, email, and expiresAt
      expect(authContent).toMatch(/return\s*\{\s*userId:\s*user\.id/);
      expect(authContent).toMatch(/email:\s*user\.email/);
      expect(authContent).toMatch(/expiresAt:\s*new Date/);
    });
  });
  
  describe('Bug 3: useToast useEffect has empty dependency array', () => {
    let useToastContent: string;
    
    beforeAll(() => {
      const filePath = path.join(__dirname, '../components/ui/use-toast.ts');
      useToastContent = fs.readFileSync(filePath, 'utf-8');
    });
    
    it('should have useEffect with empty dependency array', () => {
      // The useEffect should end with }, []); not }, [state]);
      expect(useToastContent).toMatch(/React\.useEffect\s*\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/);
    });
    
    it('should NOT have state in the dependency array', () => {
      // Should not have [state] as dependency
      expect(useToastContent).not.toMatch(/\}\s*,\s*\[\s*state\s*\]\s*\)/);
    });
    
    it('should properly add and remove listeners', () => {
      // Should have listeners.push and listeners.splice
      expect(useToastContent).toMatch(/listeners\.push\s*\(\s*setState\s*\)/);
      expect(useToastContent).toMatch(/listeners\.splice\s*\(\s*index\s*,\s*1\s*\)/);
    });
  });
});
