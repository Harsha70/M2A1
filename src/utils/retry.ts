interface RetryOptions {
    maxAttempts: number;
    baseDelay: number;
}

export const withExponentialBackoff = async (fn: () => Promise<any>, options: RetryOptions) => {
    let retries = 0;
    const { maxAttempts, baseDelay } = options;
    
    for (let attempt = 0; attempt< maxAttempts; attempt++){
        console.log(`----------------Attempt ${attempt + 1} of ${maxAttempts}`);
        try {
            return await fn();
        } catch (error: any) {
            const isLastAttempt = attempt === maxAttempts - 1;
            console.log('Error code ------',error.code);
            const isRecoverable = !['P2002', 'P2025', 'P2026'].includes(error.code);
            // prisma unique constraint violation
            //record not found

            
            if (!isRecoverable || isLastAttempt){
                throw error;
            }

            const delay = (baseDelay * Math.pow(2, attempt)) + Math.random() * 100  
            console.warn(`Retrying after ${delay}ms due to ${error.code}`);
            
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};
