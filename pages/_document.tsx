import Document, {
    DocumentContext,
    DocumentInitialProps,
    Html,
    Head,
    Main,
    NextScript
} from 'next/document';
import React from 'react';
import { SheetsRegistry, JssProvider, createGenerateId } from 'react-jss'

class MyDocument extends Document {
    static async getInitialProps(
        ctx: DocumentContext
    ): Promise<DocumentInitialProps> {

        const registry = new SheetsRegistry();
        const generateId = createGenerateId();
        const originalRenderPage = ctx.renderPage
        ctx.renderPage = () =>
            originalRenderPage({
                enhanceApp: (App) => (props) => (
                    <JssProvider registry={registry} generateId={generateId}>
                        <App {...props} />
                    </JssProvider>
                ),
            })

        const initialProps = await Document.getInitialProps(ctx)

        return {
            ...initialProps,
            styles: React.Children.toArray([initialProps.styles])
        };
    }
    render() {
        return (
            <Html lang="en">
                <Head>
                    <link rel="shortcut icon" href="/favicon.png" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" />
                    <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet" />
                </Head>
                <body style={{margin: 0}}>
                    <Main />
                    <NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument