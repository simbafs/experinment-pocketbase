import { useEffect, useReducer, useState } from 'react'
import input from '@/variants/input'
import Pocketbase from 'pocketbase'
import { PostsResponse, UsersResponse } from '@/pocketbase-type'

function usePosts(pb: Pocketbase) {
    type Post = PostsResponse<{
        author: UsersResponse
    }>
    const [posts, updatePosts] = useReducer(
        (state: Post[], action: Post | Post[]) => {
            if (Array.isArray(action)) {
                return action
            }
            return [action, ...state]
        },
        []
    )

    useEffect(() => {
        pb.collection('posts')
            .getList<Post>(1, 50, {
                expand: 'author',
            })
            .then(result => updatePosts(result.items.reverse()))
            .then(() =>
                pb.realtime.subscribe('posts', e => {
                    switch (e.action) {
                        case 'create':
                            pb.collection('posts')
                                .getOne<Post>(e.record.id, {
                                    expand: 'author',
                                })
                                .then(e => updatePosts(e))
                            break
                        default:
                            console.log(e)
                    }
                })
            )
        return () => {
            pb.realtime.unsubscribe()
        }
    }, [pb])

    return posts
}

export default function Home() {
    const [pb] = useState(new Pocketbase('http://localhost:8090'))
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const posts = usePosts(pb)
    const [isLogin, setIsLogin] = useState(false)
    const [content, setContent] = useState('')

    // prevent dom tree not the same in server and client, which will cause hydration error
    useEffect(() => setIsLogin(pb.authStore.token !== ''), [pb.authStore.token])

    const handleLogin = () => {
        pb.collection('users')
            .authWithPassword(email, password)
            .then(console.log, console.error)
    }

    const handleSend = () => {
        pb.collection('posts')
            .create({
                author: pb.authStore.model?.id,
                content,
            })
            .then(() => setContent(''))
            .then(console.log, console.error)
    }

    return (
        <div className="h-screen max-w-[800px] mx-auto flex flex-col">
            {isLogin ? (
                <>
                    <textarea
                        className={input()}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        placeholder="content"
                    />
                    <button
                        className={input()}
                        onClick={handleSend}
                        type="button"
                    >
                        Send
                    </button>
                </>
            ) : (
                <>
                    <input
                        className={input()}
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email"
                    />
                    <input
                        className={input()}
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="password"
                    />
                    <button
                        className={input()}
                        type="button"
                        onClick={handleLogin}
                    >
                        Login
                    </button>
                </>
            )}

            <hr />
            {posts.map(item => (
                <div className="m-2 p-2 border-2 border-stone-400 rounded-lg">
                    <p>{item.content}</p>
                    <hr />
                    <p className="text-sm text-stone-400">
                        by {item.expand?.author.name}
                    </p>
                </div>
            ))}
        </div>
    )
}
