import type { AppProps } from 'next/app'
import { MainLayout } from '../client/components/layout/MainLayout';
import Head from 'next/head';

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
	return (
		<MainLayout>
			<Head>
				<title>Mutarr</title>
			</Head>
			<Component {...pageProps} />
		</MainLayout>
	);
}

export default App;
