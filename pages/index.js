import React, { useContext } from "react";
import Link from "next/link";
import { AuthContext } from "../contexts/AuthContext";
import { useRouter } from "next/router";
// import PostInput from '../pages/PostInput';
import SocialFeed from "../components/SocialFeed";

const HomePage = () => {
  const { currentUser, logoutUser } = useContext(AuthContext);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error(err);
    } finally {
      router.push("/login");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Social Network</h1>
        {/* {currentUser && (
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-700 text-white py-2 px-4 rounded"
          >
            Logout
          </button>
        )} */}
      </header>

      <main>
        {currentUser ? (
          <div>
            <h2 className="text-2xl mb-4">
              Welcome, {currentUser.first_name || "User"}!
            </h2>
            <div className="mb-4">
              {/* <Link
                to={`/profile/${currentUser.user_uuid}`}
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
              >
                View My Profile
              </Link> */}
            </div>
            {/* <PostInput /> */}
            {/* <div className="bg-white shadow-md rounded p-6">
              <p className="mb-4">Your Feed</p>
            </div> */}
            <SocialFeed />
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-3xl mb-4">Welcome to Social Network</h2>
            <p className="mb-6 text-xl text-gray-600">
              Connect with friends and the world around you.
            </p>
            <div className="flex justify-center">
              <Link
                href="/login"
                className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: "20px" }}
              >
                Login
              </Link>
              <Link
                href="/register"
                className="bg-green-500 hover:bg-green-700 text-white py-2 px-6 rounded-lg text-lg"
                style={{ margin: "20px" }}
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HomePage;
