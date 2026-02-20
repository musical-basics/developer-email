"use client"

import type { EmailBlock, HeadingProps, TextProps, ImageProps, ButtonProps, DividerProps, SpacerProps, SocialProps } from "@/lib/dnd-blocks/types"

// Visual preview renderers for the DnD canvas.
// These render aesthetically in React — NOT the same as the email HTML compiler output.

function HeadingPreview({ props }: { props: HeadingProps }) {
    const Tag = props.level as keyof JSX.IntrinsicElements
    const sizes = { h1: 'text-2xl', h2: 'text-xl', h3: 'text-lg' }
    return (
        <div style={{ textAlign: props.alignment, padding: '10px 20px' }}>
            <Tag
                className={`${sizes[props.level]} font-bold`}
                style={{ color: props.color, fontFamily: props.fontFamily, margin: 0 }}
            >
                {props.text}
            </Tag>
        </div>
    )
}

function TextPreview({ props }: { props: TextProps }) {
    return (
        <div
            style={{
                textAlign: props.alignment,
                padding: '10px 20px',
                fontSize: `${props.fontSize}px`,
                lineHeight: props.lineHeight,
                color: props.color,
            }}
        >
            {props.text.split('\n').map((line, i) => (
                <span key={i}>
                    {line}
                    {i < props.text.split('\n').length - 1 && <br />}
                </span>
            ))}
        </div>
    )
}

function ImagePreview({ props }: { props: ImageProps }) {
    const isMustache = props.src.startsWith('{{')
    return (
        <div style={{ textAlign: props.alignment, padding: '0' }}>
            {isMustache ? (
                <div
                    className="bg-muted/50 border-2 border-dashed border-border flex items-center justify-center"
                    style={{ width: props.width, maxWidth: '100%', height: 200, margin: props.alignment === 'center' ? '0 auto' : undefined }}
                >
                    <span className="text-sm text-muted-foreground font-mono">{props.src}</span>
                </div>
            ) : (
                <img
                    src={props.src}
                    alt={props.alt}
                    style={{
                        width: props.width,
                        maxWidth: '100%',
                        height: props.height === 'auto' ? 'auto' : props.height,
                        display: 'block',
                        margin: props.alignment === 'center' ? '0 auto' : undefined,
                    }}
                />
            )}
        </div>
    )
}

function ButtonPreview({ props }: { props: ButtonProps }) {
    return (
        <div style={{ textAlign: props.alignment, padding: '10px 20px' }}>
            <span
                className="inline-block cursor-default"
                style={{
                    display: props.fullWidth ? 'block' : 'inline-block',
                    padding: `${props.paddingY}px ${props.paddingX}px`,
                    backgroundColor: props.bgColor,
                    color: props.textColor,
                    borderRadius: `${props.borderRadius}px`,
                    fontSize: `${props.fontSize}px`,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    textDecoration: 'none',
                }}
            >
                {props.text}
            </span>
        </div>
    )
}

function DividerPreview({ props }: { props: DividerProps }) {
    return (
        <div style={{ padding: '10px 20px', textAlign: 'center' }}>
            <hr
                style={{
                    width: `${props.widthPercent}%`,
                    border: 'none',
                    borderTop: `${props.thickness}px ${props.style} ${props.color}`,
                    margin: '0 auto',
                }}
            />
        </div>
    )
}

function SpacerPreview({ props }: { props: SpacerProps }) {
    return (
        <div
            className="relative"
            style={{ height: props.height }}
        >
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border/50" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-[10px] text-muted-foreground">
                {props.height}px
            </span>
        </div>
    )
}

const SOCIAL_COLORS: Record<string, string> = {
    facebook: '#1877F2', instagram: '#E4405F', twitter: '#1DA1F2',
    youtube: '#FF0000', linkedin: '#0A66C2', tiktok: '#000000',
}

function SocialPreview({ props }: { props: SocialProps }) {
    return (
        <div style={{ textAlign: props.alignment, padding: '10px 20px' }}>
            <div style={{ display: 'inline-flex', gap: 12 }}>
                {props.networks.map((n, i) => (
                    <div
                        key={i}
                        style={{
                            width: props.iconSize,
                            height: props.iconSize,
                            borderRadius: '50%',
                            backgroundColor: SOCIAL_COLORS[n.platform] || '#333',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: Math.round(props.iconSize * 0.4),
                            fontWeight: 'bold',
                        }}
                    >
                        {n.platform.charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
        </div>
    )
}

// --- Main Dispatcher ---

export function BlockRenderer({ block }: { block: EmailBlock }) {
    switch (block.type) {
        case 'heading': return <HeadingPreview props={block.props as HeadingProps} />
        case 'text': return <TextPreview props={block.props as TextProps} />
        case 'image': return <ImagePreview props={block.props as ImageProps} />
        case 'button': return <ButtonPreview props={block.props as ButtonProps} />
        case 'divider': return <DividerPreview props={block.props as DividerProps} />
        case 'spacer': return <SpacerPreview props={block.props as SpacerProps} />
        case 'social': return <SocialPreview props={block.props as SocialProps} />
        default: return <div className="p-4 text-red-500">Unknown block type</div>
    }
}
