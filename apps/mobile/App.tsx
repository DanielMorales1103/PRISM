import { StatusBar } from 'expo-status-bar';
import { AppShell } from './src/app/AppShell';

export default function App() {
  return (
    <>
      <AppShell />
      <StatusBar style="dark" />
    </>
  );
}
