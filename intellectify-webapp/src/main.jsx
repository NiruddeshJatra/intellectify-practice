/**
 * Entry Point for React Application
 * 
 * What is react-dom?
 * - React: Library for building UI components
 * - ReactDOM: Bridge between React and the actual browser DOM
 * - Think of it like:
 *   React = component logic/structure
 *   ReactDOM = actual rendering to browser
 * 
 * Why .render()?
 * 1. Every UI needs to be "painted" to the screen
 * 2. render() takes your React components and:
 *    - Creates actual DOM elements
 *    - Handles updates efficiently
 *    - Manages the "reconciliation" process
 * 
 * Why StrictMode?
 * StrictMode catches common mistakes by running your code twice in development.
 * Here are real examples of what it catches:
 * 
 * 1. Double-Firing Effects (Side-effect bugs):
 *    BAD:
 *    useEffect(() => {
 *      setCount(count + 1); // This will double increment!
 *    });
 * 
 *    GOOD:
 *    useEffect(() => {
 *      setCount(prev => prev + 1); // Safe: uses previous state
 *    });
 * 
 * 2. Outdated React Patterns (Legacy API):
 *    BAD:
 *    componentWillMount() { // StrictMode warns: this is deprecated
 *      this.fetchData();
 *    }
 * 
 *    GOOD:
 *    useEffect(() => {
 *      this.fetchData();
 *    }, []); // Modern way to handle mounting
 * 
 * 3. Accidental State Mutations:
 *    BAD:
 *    const [user, setUser] = useState({ name: 'John' });
 *    user.name = 'Jane'; // StrictMode catches: direct mutation!
 * 
 *    GOOD:
 *    setUser({ ...user, name: 'Jane' }); // Safe: creates new object
 * 
 * 4. Missing Dependency Warnings:
 *    BAD:
 *    useEffect(() => {
 *      console.log(count); // StrictMode warns: count not in deps
 *    }, []);
 * 
 *    GOOD:
 *    useEffect(() => {
 *      console.log(count);
 *    }, [count]); // Properly declares dependencies
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Find the DOM element where React should mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
