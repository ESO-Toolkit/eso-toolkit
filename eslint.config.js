// ESLint 9 flat config format
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import storybook from 'eslint-plugin-storybook';

export default [
  // Global ignores (replaces .eslintignore)
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'public/**',
      '*.config.js',
      'craco.config.js',
      'coverage/**',
      'dist/**',
      '.storybook/**',
      'src/**/*.d.ts',
      'src/data/abilities.json',
      '**/*.stories.ts',
      '**/*.stories.tsx',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
  },
  // Base configuration for all files
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
        project: './tsconfig.json',
        createDefaultProgram: false,
      },
      globals: {
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        fetch: 'readonly',
        alert: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        performance: 'readonly',
        location: 'readonly',
        caches: 'readonly',
        
        // Node.js globals
        process: 'readonly',
        global: 'readonly',
        module: 'readonly',
        NodeJS: 'readonly',
        
        // Service Worker globals
        ServiceWorkerGlobalScope: 'readonly',
        FetchEvent: 'readonly',
        ExtendableEvent: 'readonly',
        ExtendableMessageEvent: 'readonly',
        
        // Test globals
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        jest: 'readonly',
        
        // React globals
        React: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      react,
      'react-hooks': reactHooks,
      import: importPlugin,
      storybook,
    },
    settings: {
      react: {
        version: 'detect',
      },
      'import/resolver': {
        typescript: true,
        node: true,
      },
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,
      
      // TypeScript recommended rules
      ...typescript.configs.recommended.rules,
      
      // React recommended rules
      ...react.configs.recommended.rules,
      
      // React Hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      
      // React Hooks exhaustive deps (what Strict Mode helps find)
      'react-hooks/exhaustive-deps': 'error', // Ensure all dependencies are listed
      'react-hooks/rules-of-hooks': 'error',   // Ensure hooks are called correctly
      
      // Import recommended rules
      ...importPlugin.configs.recommended.rules,
      ...importPlugin.configs.typescript.rules,
      
      // Custom rules
      'no-console': 'error',
      'import/no-default-export': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      
      // Disable React in JSX scope rule (not needed in React 17+)
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off', // Using TypeScript for prop validation
      
      // Import order rules
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
          allowDirectConstAssertionInArrowFunctions: true,
        },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Allow Three.js properties in React components
      'react/no-unknown-property': [
        'error',
        {
          ignore: [
            // Three.js mesh properties
            'geometry',
            'position',
            'rotation',
            'scale',
            'visible',
            'castShadow',
            'receiveShadow',
            'args',
            
            // Three.js material properties
            'transparent',
            'opacity',
            'side',
            'map',
            'alphaTest',
            'shininess',
            'depthWrite',
            
            // Three.js light properties
            'intensity',
            'shadow-mapSize-width',
            'shadow-mapSize-height',
          ],
        },
      ],
    },
  },
  
  // Configuration for test files
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },
  
  // Configuration for story files
  {
    files: ['**/*.stories.@(ts|tsx|js|jsx|mjs|cjs)', '.storybook/main.ts'],
    rules: {
      'import/no-default-export': 'off',
      'storybook/default-exports': 'error',
    },
  },
  
  // Configuration for specific files that need default exports
  {
    files: [
      'src/index.tsx',
      'src/App.tsx',
      'src/reportWebVitals.ts',
      'vite.config.mjs',
      'jest.config.js',
      'src/**/*.d.ts',
      '**/*Slice.ts',
      '**/store/**/*.ts',
      'src/graphql.d.ts',
    ],
    rules: {
      'import/no-default-export': 'off',
    },
  },
  
  // Configuration for logger context (allow console)
  {
    files: ['src/contexts/LoggerContext.tsx'],
    rules: {
      'no-console': 'off',
    },
  },
  
  // Configuration for skill lines data (no project)
  {
    files: ['src/data/skill-lines/**/*'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },
];