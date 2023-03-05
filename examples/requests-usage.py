import requests

# 得到一个名称为r的Response类型的对象
# 从该对象里能获取所有需要的信息
# r = requests.get('https://api.github.com/events')


r = requests.post('https://httpbin.org/post', data={'key': 'value'})
r = requests.put('https://httpbin.org/put', data={'key': 'value'})
r = requests.delete('https://httpbin.org/delete')
r = requests.head('https://httpbin.org/get')
r = requests.options('https://httpbin.org/get')
# 编码方式
print(r.apparent_encoding)
# 响应内容，unicode类型数据
print(r.text)
# 解码r.text的编码方式
print(r.encoding)
# 响应内容，以字节为单位
print(r.content)
# 状态码
print(r.status_code)
