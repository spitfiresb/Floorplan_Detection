import { useState, useEffect } from 'react';

interface UseTypewriterProps {
    text: string;
    speed?: number;
    startDelay?: number;
}

export const useTypewriter = ({
    text,
    speed = 50,
    startDelay = 0
}: UseTypewriterProps) => {
    const [displayText, setDisplayText] = useState('');
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        let currentIndex = 0;

        const startTyping = () => {
            timeoutId = setInterval(() => {
                if (currentIndex < text.length) {
                    setDisplayText(text.slice(0, currentIndex + 1));
                    currentIndex++;
                } else {
                    setIsFinished(true);
                    clearInterval(timeoutId);
                }
            }, speed);
        };

        if (startDelay > 0) {
            timeoutId = setTimeout(startTyping, startDelay);
        } else {
            startTyping();
        }

        return () => {
            clearTimeout(timeoutId);
            clearInterval(timeoutId);
        };
    }, [text, speed, startDelay]);

    return { displayText, isFinished };
};
