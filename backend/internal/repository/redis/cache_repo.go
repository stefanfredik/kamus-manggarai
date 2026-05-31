package redisrepo

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/kamus-manggarai/backend/internal/domain/repository"
	"github.com/redis/go-redis/v9"
)

type cacheRepo struct {
	client *redis.Client
}

func NewCacheRepo(client *redis.Client) repository.CacheRepository {
	return &cacheRepo{client: client}
}

func (c *cacheRepo) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := c.client.Get(ctx, key).Bytes()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return redis.Nil
		}
		return err
	}
	return json.Unmarshal(val, dest)
}

func (c *cacheRepo) Set(ctx context.Context, key string, value interface{}, ttlSeconds int) error {
	b, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return c.client.Set(ctx, key, b, time.Duration(ttlSeconds)*time.Second).Err()
}

func (c *cacheRepo) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return c.client.Del(ctx, keys...).Err()
}

func (c *cacheRepo) DeletePattern(ctx context.Context, pattern string) error {
	iter := c.client.Scan(ctx, 0, pattern, 100).Iterator()
	pipe := c.client.Pipeline()
	count := 0
	for iter.Next(ctx) {
		pipe.Del(ctx, iter.Val())
		count++
		if count >= 200 {
			if _, err := pipe.Exec(ctx); err != nil {
				return err
			}
			count = 0
		}
	}
	if err := iter.Err(); err != nil {
		return err
	}
	if count > 0 {
		_, err := pipe.Exec(ctx)
		return err
	}
	return nil
}

func (c *cacheRepo) Exists(ctx context.Context, key string) (bool, error) {
	n, err := c.client.Exists(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

func (c *cacheRepo) Incr(ctx context.Context, key string, ttlSeconds int) (int64, error) {
	n, err := c.client.Incr(ctx, key).Result()
	if err != nil {
		return 0, err
	}
	if n == 1 && ttlSeconds > 0 {
		c.client.Expire(ctx, key, time.Duration(ttlSeconds)*time.Second)
	}
	return n, nil
}

var ErrCacheMiss = redis.Nil
