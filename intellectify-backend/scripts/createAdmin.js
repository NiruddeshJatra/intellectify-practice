#!/usr/bin/env node

/**
 * Secure Admin Creation Script
 * 
 * This script creates admin users with email/password authentication.
 * It should only be run by system administrators with direct server access.
 * 
 * Usage:
 *   node scripts/createAdmin.js
 *   
 * Environment Variables Required:
 *   - DATABASE_URL: PostgreSQL connection string
 *   - JWT_ACCESS_SECRET: JWT secret for token generation
 *   
 * Security Features:
 *   - Interactive password input (hidden from terminal)
 *   - Password strength validation
 *   - Email format validation
 *   - Duplicate user checking
 *   - Secure password hashing with bcrypt
 */

const readline = require('readline');
const adminAuthService = require('../src/services/adminAuthService');

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if email is valid
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with isValid and message
 */
function validatePassword(password) {
  if (password.length < 8) {
    return { isValid: false, message: 'Password must be at least 8 characters long' };
  }
  
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one uppercase letter' };
  }
  
  if (!/[a-z]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one lowercase letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one number' };
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { isValid: false, message: 'Password must contain at least one special character' };
  }
  
  return { isValid: true, message: 'Password is strong' };
}

/**
 * Prompts user for input
 * @param {string} question - Question to ask
 * @param {boolean} hidden - Whether to hide input (for passwords)
 * @returns {Promise<string>} User input
 */
function promptUser(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (hidden) {
      // Hide password input
      rl.stdoutMuted = true;
      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.stdoutMuted) {
          rl.output.write('*');
        } else {
          rl.output.write(stringToWrite);
        }
      };
    }

    rl.question(question, (answer) => {
      rl.close();
      if (hidden) {
        console.log(); // New line after hidden input
      }
      resolve(answer.trim());
    });
  });
}

/**
 * Main function to create admin user
 */
async function createAdmin() {
  console.log(`${colors.bold}${colors.blue}=== Intellectify Admin Creation Script ===${colors.reset}\n`);
  
  try {
    // Check environment variables
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    
    if (!process.env.JWT_ACCESS_SECRET) {
      throw new Error('JWT_ACCESS_SECRET environment variable is required');
    }

    console.log(`${colors.green}✓ Environment variables validated${colors.reset}\n`);

    // Get admin details
    console.log(`${colors.yellow}Please provide admin user details:${colors.reset}\n`);

    // Get and validate email
    let email;
    while (true) {
      email = await promptUser('Admin Email: ');
      if (!email) {
        console.log(`${colors.red}✗ Email is required${colors.reset}`);
        continue;
      }
      if (!validateEmail(email)) {
        console.log(`${colors.red}✗ Please enter a valid email address${colors.reset}`);
        continue;
      }
      break;
    }

    // Get admin name
    let name;
    while (true) {
      name = await promptUser('Admin Name: ');
      if (!name) {
        console.log(`${colors.red}✗ Name is required${colors.reset}`);
        continue;
      }
      if (name.length < 2) {
        console.log(`${colors.red}✗ Name must be at least 2 characters long${colors.reset}`);
        continue;
      }
      break;
    }

    // Get and validate password
    let password;
    while (true) {
      password = await promptUser('Admin Password: ', true);
      if (!password) {
        console.log(`${colors.red}✗ Password is required${colors.reset}`);
        continue;
      }
      
      const validation = validatePassword(password);
      if (!validation.isValid) {
        console.log(`${colors.red}✗ ${validation.message}${colors.reset}`);
        continue;
      }
      
      // Confirm password
      const confirmPassword = await promptUser('Confirm Password: ', true);
      if (password !== confirmPassword) {
        console.log(`${colors.red}✗ Passwords do not match${colors.reset}`);
        continue;
      }
      
      break;
    }

    console.log(`\n${colors.yellow}Creating admin user...${colors.reset}`);

    // Create admin user
    const user = await adminAuthService.createAdmin(email, password, name);

    console.log(`\n${colors.green}${colors.bold}✓ Admin user created successfully!${colors.reset}`);
    console.log(`${colors.green}User ID: ${user.id}${colors.reset}`);
    console.log(`${colors.green}Email: ${user.email}${colors.reset}`);
    console.log(`${colors.green}Name: ${user.name}${colors.reset}`);
    console.log(`${colors.green}Role: ${user.role}${colors.reset}`);
    console.log(`${colors.green}Created: ${user.createdAt}${colors.reset}\n`);

    console.log(`${colors.blue}The admin user can now log in at: /admin/login${colors.reset}`);

  } catch (error) {
    console.error(`\n${colors.red}${colors.bold}✗ Error creating admin user:${colors.reset}`);
    console.error(`${colors.red}${error.message}${colors.reset}\n`);
    
    if (error.message.includes('already exists')) {
      console.log(`${colors.yellow}Tip: Use a different email address or update the existing user${colors.reset}`);
    } else if (error.message.includes('DATABASE_URL')) {
      console.log(`${colors.yellow}Tip: Make sure your .env file is properly configured${colors.reset}`);
    }
    
    process.exit(1);
  }
}

// Handle script interruption
process.on('SIGINT', () => {
  console.log(`\n\n${colors.yellow}Script interrupted by user${colors.reset}`);
  process.exit(0);
});

// Run the script
if (require.main === module) {
  createAdmin().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
  });
}

module.exports = { createAdmin };