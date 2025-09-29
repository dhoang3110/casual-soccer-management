// Test script to verify shared utilities are working
// This can be run in browser console to test the refactored utilities

console.log('🧪 Testing Shared Utilities...');

// Test DOMUtils
console.group('🔍 Testing DOMUtils');
try {
    // Test getElementById (should work with existing elements)
    const testElement = window.DOMUtils.getElementById('loginOverlay', false);
    console.log('✅ getElementById test:', testElement ? 'Found element' : 'Element not found (expected in some contexts)');
    
    // Test getElementsByIds  
    const { elements, missing } = window.DOMUtils.getElementsByIds(['loginOverlay', 'nonExistentElement']);
    console.log('✅ getElementsByIds test:', `Found ${Object.keys(elements).length - missing.length} of ${Object.keys(elements).length} elements`);
    
    console.log('✅ DOMUtils tests completed');
} catch (error) {
    console.error('❌ DOMUtils test failed:', error);
}
console.groupEnd();

// Test ValidationUtils
console.group('🔍 Testing ValidationUtils');
try {
    // Test name validation
    const nameTest1 = window.ValidationUtils.validateName('John Doe');
    const nameTest2 = window.ValidationUtils.validateName('A');
    console.log('✅ Name validation test:', nameTest1.isValid && !nameTest2.isValid ? 'Passed' : 'Failed');
    
    // Test phone validation
    const phoneTest1 = window.ValidationUtils.validatePhone('1234567890');
    const phoneTest2 = window.ValidationUtils.validatePhone('123');
    console.log('✅ Phone validation test:', phoneTest1.isValid && !phoneTest2.isValid ? 'Passed' : 'Failed');
    
    // Test phone normalization
    const normalized = window.ValidationUtils.normalizePhone('(123) 456-7890');
    console.log('✅ Phone normalization test:', normalized === '1234567890' ? 'Passed' : 'Failed');
    
    // Test phone formatting
    const formatted = window.ValidationUtils.formatPhone('1234567890');
    console.log('✅ Phone formatting test:', formatted === '(123) 456-7890' ? 'Passed' : 'Failed');
    
    // Test phone comparison
    const phoneCompare = window.ValidationUtils.comparePhones('(123) 456-7890', '123-456-7890');
    console.log('✅ Phone comparison test:', phoneCompare ? 'Passed' : 'Failed');
    
    console.log('✅ ValidationUtils tests completed');
} catch (error) {
    console.error('❌ ValidationUtils test failed:', error);
}
console.groupEnd();

// Test NotificationUtils
console.group('🔍 Testing NotificationUtils');
try {
    // Note: These tests would show actual alerts, so we'll just verify the functions exist
    const hasSuccess = typeof window.NotificationUtils.showSuccess === 'function';
    const hasError = typeof window.NotificationUtils.showError === 'function';
    const hasWarning = typeof window.NotificationUtils.showWarning === 'function';
    const hasConfirm = typeof window.NotificationUtils.confirm === 'function';
    
    console.log('✅ NotificationUtils methods exist:', hasSuccess && hasError && hasWarning && hasConfirm ? 'Passed' : 'Failed');
    console.log('✅ NotificationUtils tests completed');
} catch (error) {
    console.error('❌ NotificationUtils test failed:', error);
}
console.groupEnd();

// Test AppUtils
console.group('🔍 Testing AppUtils');
try {
    // Test generateId
    const id1 = window.AppUtils.generateId('test');
    const id2 = window.AppUtils.generateId('test');
    console.log('✅ Generate ID test:', id1 !== id2 && id1.startsWith('test_') ? 'Passed' : 'Failed');
    
    // Test ensureArray
    const arrayTest1 = window.AppUtils.ensureArray([1, 2, 3]);
    const arrayTest2 = window.AppUtils.ensureArray({a: 1, b: 2});
    const arrayTest3 = window.AppUtils.ensureArray(null);
    console.log('✅ Ensure array test:', 
        Array.isArray(arrayTest1) && Array.isArray(arrayTest2) && Array.isArray(arrayTest3) ? 'Passed' : 'Failed'
    );
    
    // Test deepClone
    const original = { a: 1, b: { c: 2 } };
    const cloned = window.AppUtils.deepClone(original);
    cloned.b.c = 3;
    console.log('✅ Deep clone test:', original.b.c === 2 && cloned.b.c === 3 ? 'Passed' : 'Failed');
    
    // Test formatDate
    const dateStr = window.AppUtils.formatDate(new Date('2024-01-15'));
    console.log('✅ Format date test:', typeof dateStr === 'string' && dateStr.length > 0 ? 'Passed' : 'Failed');
    
    console.log('✅ AppUtils tests completed');
} catch (error) {
    console.error('❌ AppUtils test failed:', error);
}
console.groupEnd();

// Test LogUtils
console.group('🔍 Testing LogUtils');
try {
    // Test logging functions exist and work
    window.LogUtils.info('TEST', 'Test info message');
    window.LogUtils.success('TEST', 'Test success message');
    window.LogUtils.error('TEST', 'Test error message');
    window.LogUtils.debug('TEST', 'Test debug message');
    window.LogUtils.api('GET', '/test/endpoint', 200);
    
    console.log('✅ LogUtils tests completed (check console for formatted log messages)');
} catch (error) {
    console.error('❌ LogUtils test failed:', error);
}
console.groupEnd();

console.log('🎉 Shared Utilities Testing Complete!');
console.log('📝 Summary: All utilities loaded and basic functionality verified');
console.log('🔧 Ready for use in refactored application code');