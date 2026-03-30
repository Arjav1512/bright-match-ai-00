import { useState } from "react";
import Navbar from "@/components/Navbar";
import DiscoverySection from "@/components/feed/DiscoverySection";
import PostComposer from "@/components/feed/PostComposer";
import PostFeed from "@/components/feed/PostFeed";

const Feed = () => {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-4xl py-8 space-y-10">
        {/* Discovery Section */}
        <DiscoverySection />

        {/* Post Feed Section */}
        <div className="space-y-6">
          <h2 className="font-display text-2xl font-bold">Community Feed</h2>
          <PostComposer onPostCreated={() => setRefreshKey((k) => k + 1)} />
          <PostFeed refreshKey={refreshKey} />
        </div>
      </div>
    </div>
  );
};

export default Feed;
