import { describe, expect, it } from 'vitest';
import { boundPageSize, canUseCapability, safeInstagramUrl } from './domain';

describe('capability gating',()=>{
  it('requires professional account eligibility and the matching permission',()=>{
    expect(canUseCapability('messaging','personal',['instagram_business_manage_messages'])).toBe(false);
    expect(canUseCapability('messaging','creator',[])).toBe(false);
    expect(canUseCapability('messaging','creator',['instagram_business_manage_messages'])).toBe(true);
    expect(canUseCapability('publishing','business',['instagram_business_content_publish'])).toBe(true);
    expect(canUseCapability('profile',null,['instagram_business_basic'])).toBe(false);
  });
  it('bounds requested page sizes',()=>{
    expect(boundPageSize(5)).toBe(5); expect(boundPageSize(0)).toBe(1); expect(boundPageSize(900)).toBe(50); expect(boundPageSize(4.9)).toBe(4);
  });
  it('accepts only HTTPS Instagram destinations',()=>{
    expect(safeInstagramUrl('https://www.instagram.com/reel/abc')).toContain('instagram.com');
    expect(safeInstagramUrl('javascript:alert(1)')).toBeNull();
    expect(safeInstagramUrl('https://instagram.com.evil.example/reel')).toBeNull();
  });
});
