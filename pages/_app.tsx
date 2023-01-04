import type { AppProps } from 'next/app'
import { NextUIProvider, createTheme } from '@nextui-org/react';
import { Layout } from '../client/components/layout/Layout';

const theme = createTheme({
	type: 'dark',
});

function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
	return (
		<NextUIProvider theme={theme}>
			<Layout>
				<Component {...pageProps} />
			</Layout>
		</NextUIProvider>
	);
}

export default App;
