import { threadId } from 'worker_threads';
import * as z from 'zod';

export const ThreadValidation = z.object({
    thread: z.string().nonempty().min(3,{ message: "Minimun 3 characters" }),
    accountId: z.string(),
});

export const CommentValidation = z.object({
    thread: z.string().nonempty().min(3,{ message: "Minimun 3 characters" }),
});
