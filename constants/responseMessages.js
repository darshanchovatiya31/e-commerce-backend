// Response messages constants
const RESPONSE_MESSAGES = {
  // Auth messages
  AUTH: {
    REGISTER_SUCCESS: 'User registered successfully',
    LOGIN_SUCCESS: 'Login successful',
    LOGOUT_SUCCESS: 'Logout successful',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'Email already exists',
    USER_NOT_FOUND: 'User not found',
    PASSWORD_RESET_SENT: 'Password reset link sent to your email',
    PASSWORD_RESET_SUCCESS: 'Password reset successful',
    TOKEN_INVALID: 'Invalid or expired token',
    ACCESS_DENIED: 'Access denied',
    ADMIN_REQUIRED: 'Admin access required'
  },
  
  // Product messages
  PRODUCT: {
    CREATED: 'Product created successfully',
    UPDATED: 'Product updated successfully',
    DELETED: 'Product deleted successfully',
    NOT_FOUND: 'Product not found',
    FETCH_SUCCESS: 'Products fetched successfully'
  },
  
  // Order messages
  ORDER: {
    CREATED: 'Order placed successfully',
    UPDATED: 'Order updated successfully',
    CANCELLED: 'Order cancelled successfully',
    NOT_FOUND: 'Order not found',
    FETCH_SUCCESS: 'Orders fetched successfully'
  },
  
  // Cart messages
  CART: {
    ITEM_ADDED: 'Item added to cart',
    ITEM_UPDATED: 'Cart item updated',
    ITEM_REMOVED: 'Item removed from cart',
    CLEARED: 'Cart cleared successfully',
    NOT_FOUND: 'Cart item not found'
  },
  
  // Wishlist messages
  WISHLIST: {
    ITEM_ADDED: 'Item added to wishlist',
    ITEM_REMOVED: 'Item removed from wishlist',
    CLEARED: 'Wishlist cleared successfully'
  },
  
  // General messages
  GENERAL: {
    SUCCESS: 'Operation completed successfully',
    ERROR: 'An error occurred',
    VALIDATION_ERROR: 'Validation failed',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access forbidden',
    SERVER_ERROR: 'Internal server error'
  }
};

module.exports = RESPONSE_MESSAGES;