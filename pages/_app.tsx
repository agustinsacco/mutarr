import type { AppProps } from 'next/app'
import { MainLayout } from '../client/components/layout/MainLayout';
import Head from 'next/head';

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
	return (
		<MainLayout>
			<Head>
				<title>Mutarr</title>
				<link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&display=swap" rel="stylesheet" />
				<link href="https://fonts.googleapis.com/css2?family=Source+Code+Pro&family=Tektur:wght@600&display=swap" rel="stylesheet" />			</Head>
			<Component {...pageProps} />
		</MainLayout>
	);
}

export default App;
