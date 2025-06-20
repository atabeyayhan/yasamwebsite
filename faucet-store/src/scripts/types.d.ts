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