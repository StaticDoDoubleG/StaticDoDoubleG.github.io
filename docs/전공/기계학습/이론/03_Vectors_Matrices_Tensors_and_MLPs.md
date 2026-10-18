# 벡터·행렬·텐서와 MLP

## 1. 데이터 구조
스칼라는 하나의 값, 벡터는 1차원 배열, 행렬은 2차원 표, 텐서는 이를 일반화한 다차원 배열이다. PyTorch tensor는 shape, dtype, device를 가지며 GPU 연산을 위해 같은 device에 배치해야 한다.

이미지 batch는 보통 `(B, C, H, W)`이다. MNIST는 `(B, 1, 28, 28)`이고 완전연결층에 넣기 전 `(B, 784)`로 펼친다.

## 2. 행렬 곱과 affine
완전연결층은
$$Y=XW+b$$
형태의 affine 계산을 수행한다. $X$가 `(B, in_features)`라면 $W$의 대응 차원이 `in_features`여야 하고 결과는 `(B, out_features)`다. bias는 batch마다 broadcast되어 더해진다.

## 3. 다층 퍼셉트론
MLP는 affine 층과 비선형 활성화 함수를 반복한다.
$$h_1=\phi(XW_1+b_1),\qquad h_2=\phi(h_1W_2+b_2)$$
선형층만 반복하면 하나의 affine 층으로 합쳐지므로 `Linear → Activation → Linear` 구조가 중요하다.

## 4. shape 점검법
- `Linear(in, out)`의 `in`은 직전 tensor의 마지막 feature 수와 같아야 한다.
- MNIST의 `28*28=784`를 누락하지 않는다.
- 출력 클래스가 10이면 마지막 층은 `Linear(hidden, 10)`이다.
- shape 오류가 나면 층을 더 추가하기 전에 각 중간 shape를 출력한다.

## 5. broadcasting과 bias

`X @ W`의 결과가 `(B, D_out)`일 때 bias `(D_out,)`는 각 batch 행에 broadcast되어 더해진다. bias의 shape을 `(B, D_out)`로 만들면 샘플마다 다른 bias가 생기는 구조가 되므로, bias는 batch 수와 무관한 feature별 값이어야 한다.

## 6. flatten과 batch 차원

`Flatten()`은 batch 차원을 유지한 채 나머지 차원을 합친다. `(B, 1, 28, 28)`을 `(B, 784)`로 바꾸어야 하며, 전체 tensor를 한 차원으로 펴서 `(B*784,)`로 만들면 샘플 경계가 사라진다. `Linear`는 마지막 차원에 대해 계산하므로 batch 차원을 보존하는 것이 전제다.

## 7. MLP의 표현과 병목

은닉층 차원이 너무 작으면 많은 입력 정보를 적은 feature로 압축하는 병목이 생긴다. 차원을 크게 하면 표현 가능한 함수가 늘지만 parameter 수, 메모리, 과적합 위험도 증가한다. 깊이와 너비를 바꿀 때는 parameter 수와 validation 성능을 함께 기록한다.

선형층 사이에 activation이 없는 구조는
$$XW_1W_2+b_1W_2+b_2$$
처럼 하나의 affine 변환으로 다시 정리된다. ReLU나 sigmoid 하나가 들어가면 이 결합이 더 이상 단일 선형 변환으로 축약되지 않는다.
