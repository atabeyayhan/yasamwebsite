declare namespace google.accounts.id {
    function initialize(config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
    }): void;

    function renderButton(
        element: HTMLElement,
        options: {
            theme?: 'outline' | 'filled_blue' | 'filled_black';
            size?: 'large' | 'medium' | 'small';
            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
            logo_alignment?: 'left' | 'center';
            width?: number;
            locale?: string;
        }
    ): void;
}

declare function jwt_decode(token: string): {
    sub: string;
    email: string;
    name: string;
    picture?: string;
    [key: string]: any;
};

// Global functions for admin functionality
declare global {
    interface Window {
        addToCartById: (productId: string) => void;
        showProductDetail: (productId: string) => void;
        openAdminPanel: () => void;
        saveProduct: (productData: any) => void;
        deleteProduct: (productId: string) => void;
        editProduct: (productId: string) => void;
        closeModal: () => void;
    }
} 