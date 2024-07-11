import { ComponentProps, ReactNode } from  'react';
import { tv, VariantProps } from 'tailwind-variants';

const buttonVariants = tv({
    base: 'rounded-lg px-5 font-medium flex items-center justify-center gap-2',

    variants: {
        variant: {
            primary: 'bg-lime-300 text-lime-950 hover:bg-lime-300',
            secondary: 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700',
        },

        size: {
            default: 'py-2',
            full: 'w-full h-11',
        },
    },

    defaultVariants: {
        variant: 'primary',
        size: 'default',
    }
})

/*ComponentProps<'button'> é usado para extender todas as propriedades que um botao pode receber */

interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
    children: ReactNode /*só string seria o texto só mas para passar tbm outras tags usamos o reactnode*/
}

export function Button({ children, variant, size, ...props } : ButtonProps){
    return(
        <button {...props} className={buttonVariants({ variant, size })}>
            {children}
        </button>
    )
}