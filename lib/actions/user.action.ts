'use server'

import { revalidatePath } from "next/cache"
import User from "../models/user.model"
import { connectToDB } from "../mongoose"
import { FilterQuery, model, SortOrder } from "mongoose"
import Thread from "../models/thread.model"

interface Params { 
    userId: string,
    username: string,
    name: string,
    bio: string,
    image: string,
    path: string
}

export async function updateUser({
    userId,
    username,
    name,
    bio,
    image,
    path
}: Params): Promise<void> {
    connectToDB()
    try {
        await User.findOneAndUpdate(
            { id: userId },
            { 
                username: username.toLowerCase(),
                name,
                bio,
                image,
                onboarded: true,
            },
            { upsert: true } // update and insert if it already exists, otherwise insert the new row if it doesn't exist
        )

        if (path === '/profile/edit') {
            revalidatePath(path)
        } 
        console.log('User updated successfully') 
    } catch (error: any) {
        throw new Error(`Fail to create/update user: ${error.message}`)
    }
}

export async function fetchUser(userId: string) {
    try {
        connectToDB()

        return await User.findOne({ id: userId })
        // .populate({
        //     path: "communities",
        //     model: Community
        // })
    } catch (error: any) {
        throw new Error(`Fail to fetch user: ${error.message}`)                                             
    }
}

export async function fetchUserPosts(userId: string) {
    try {
        connectToDB()

        // Find all threads authored by the user with the given userId
        const threads = await User.findOne({ id: userId })
            .populate({
                path: "threads",
                model: Thread,
                populate: {
                    path: 'children',
                    model: Thread,
                    populate: {
                        path: 'author',
                        model: User,
                        select: 'name image id'
                    }
                }
            })
        return threads
    }
    catch (error: any) {
        throw new Error(`Fail to fetch user posts: ${error.message}`)
    }
}

export async function fetchUsers({
    userId,
    pageNumber = 1,
    pageSize = 20,
    searchString = "",
    sortBy = "desc",
}: {
    userId: string,
    pageNumber?: number,
    pageSize?: number,
    searchString?: string,
    sortBy?: SortOrder
}) {
    try {
        connectToDB()

        const skipAmount = (pageNumber - 1) * pageSize

        const regex = new RegExp(searchString, 'i')
        
        const query: FilterQuery<typeof User> = {
            id: { $ne: userId },
        }

        if(searchString.trim() !== "") {
            query.$or = [
                { username: { $regex: regex } },
                { name: { $regex: regex } }
            ]
        }

        const sortOptions = { createdAt: sortBy }

        const usersQuery = User.find(query)
            .sort(sortOptions)
            .skip(skipAmount)
            .limit(pageSize)
        
        const totalUsers = await User.countDocuments(query)

        const users = await usersQuery.exec()

        const isNext = totalUsers > skipAmount + users.length
        
        return { users, isNext }
    } catch (error: any) {
        throw new Error(`Fail to fetch users: ${error.message}`)
    }
}

export async function getActivity(userId: string) {
  try {
    connectToDB();

    // Find all threads created by the user
    const userThreads = await Thread.find({ author: userId });

    // Collect all the child thread ids (replies) from the 'children' field of each user thread
    const childThreadIds = userThreads.reduce((acc, userThread) => {
      return acc.concat(userThread.children);
    }, []);

    // Find and return the child threads (replies) excluding the ones created by the same user
    const replies = await Thread.find({
      _id: { $in: childThreadIds },
      author: { $ne: userId }, // Exclude threads authored by the same user
    }).populate({
      path: "author",
      model: User,
      select: "name image _id",
    });

    return replies;
  } catch (error) {
    console.error("Error fetching replies: ", error);
    throw error;
  }
}

